import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { UserNotification } from '../entities/user-notification.entity';
import { FcmToken } from '../entities/fcm-token.entity';
import { User, UserRole } from '../../../../../auth-service/src/app/entities/user.entity';
import { MessagingService } from '@lagunapp-backend/messaging';
import { FirebasePushService } from './firebase-push.service';

const VALID_TYPES = ['dialog', 'push', 'both'];
const VALID_PRIORITIES = ['normal', 'high', 'critical'];
const VALID_TARGET_TYPES = ['all', 'role', 'user', 'app'];

@Injectable()
export class NotificationsGatewayService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(UserNotification)
    private readonly userNotifRepo: Repository<UserNotification>,
    @InjectRepository(FcmToken)
    private readonly fcmRepo: Repository<FcmToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly messaging: MessagingService,
    private readonly firebasePush: FirebasePushService,
  ) {}

  // ── Admin ──

  async createNotification(
    dto: {
      title: string;
      message: string;
      type?: string;
      priority?: string;
      targetType?: string;
      targetValue?: string;
      targetApps?: string[];
      actionUrl?: string;
      actionLabel?: string;
      scheduledAt?: string;
    },
    createdBy: string,
  ) {
    if (!dto.title || !dto.message) {
      throw new BadRequestException('title y message son requeridos');
    }
    if (dto.type && !VALID_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `type invalido. Opciones: ${VALID_TYPES.join(', ')}`,
      );
    }
    if (dto.priority && !VALID_PRIORITIES.includes(dto.priority)) {
      throw new BadRequestException(
        `priority invalido. Opciones: ${VALID_PRIORITIES.join(', ')}`,
      );
    }
    if (dto.targetType && !VALID_TARGET_TYPES.includes(dto.targetType)) {
      throw new BadRequestException(
        `targetType invalido. Opciones: ${VALID_TARGET_TYPES.join(', ')}`,
      );
    }

    const notification = this.notifRepo.create({
      title: dto.title,
      message: dto.message,
      type: dto.type || 'both',
      priority: dto.priority || 'normal',
      targetType: dto.targetType || 'all',
      targetValue: dto.targetValue || null,
      targetApps: dto.targetApps || null,
      actionUrl: dto.actionUrl || null,
      actionLabel: dto.actionLabel || null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      createdBy,
    });

    const saved = await this.notifRepo.save(notification);

    // If scheduled for later, don't send now
    if (saved.scheduledAt && saved.scheduledAt > new Date()) {
      return saved;
    }

    // Send immediately
    await this.sendNotification(saved);

    return saved;
  }

  async getNotifications(filters: {
    type?: string;
    priority?: string;
    targetType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.isActive = :isActive', { isActive: true });

    if (filters.type) {
      qb.andWhere('n.type = :type', { type: filters.type });
    }
    if (filters.priority) {
      qb.andWhere('n.priority = :priority', { priority: filters.priority });
    }
    if (filters.targetType) {
      qb.andWhere('n.targetType = :targetType', {
        targetType: filters.targetType,
      });
    }
    if (filters.search) {
      qb.andWhere('(n.title ILIKE :search OR n.message ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('n.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async getNotification(id: string) {
    const notification = await this.notifRepo.findOne({
      where: { id, isActive: true },
    });
    if (!notification) {
      throw new NotFoundException('Notificacion no encontrada');
    }

    const recipientCount = await this.userNotifRepo.count({
      where: { notificationId: id },
    });
    const readCount = await this.userNotifRepo.count({
      where: { notificationId: id, isRead: true },
    });

    return { ...notification, recipientCount, readCount };
  }

  async scheduleNotification(id: string, scheduledAt: string) {
    const notification = await this.notifRepo.findOne({
      where: { id, isActive: true },
    });
    if (!notification) {
      throw new NotFoundException('Notificacion no encontrada');
    }
    if (!scheduledAt) {
      throw new BadRequestException('scheduledAt es requerido');
    }

    notification.scheduledAt = new Date(scheduledAt);
    return this.notifRepo.save(notification);
  }

  // ── User ──

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const userNotifs = await this.userNotifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    if (userNotifs.length === 0) {
      return { data: [], meta: { total: 0, page, limit } };
    }

    const notifIds = userNotifs.map((un) => un.notificationId);
    const notifications = await this.notifRepo.find({
      where: { id: In(notifIds), isActive: true },
    });

    const notifMap = new Map(notifications.map((n) => [n.id, n]));
    const total = await this.userNotifRepo.count({ where: { userId } });

    const data = userNotifs
      .map((un) => {
        const notif = notifMap.get(un.notificationId);
        if (!notif) return null;
        return {
          id: un.id,
          notificationId: un.notificationId,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          priority: notif.priority,
          actionUrl: notif.actionUrl,
          actionLabel: notif.actionLabel,
          isRead: un.isRead,
          isDismissed: un.isDismissed,
          readAt: un.readAt,
          createdAt: un.createdAt,
        };
      })
      .filter(Boolean);

    return { data, meta: { total, page, limit } };
  }

  async markAsRead(userId: string, notificationId: string) {
    const userNotif = await this.userNotifRepo.findOne({
      where: { userId, notificationId },
    });
    if (!userNotif) {
      throw new NotFoundException('Notificacion de usuario no encontrada');
    }

    userNotif.isRead = true;
    userNotif.readAt = new Date();
    return this.userNotifRepo.save(userNotif);
  }

  async markAllAsRead(userId: string) {
    await this.userNotifRepo
      .createQueryBuilder()
      .update(UserNotification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = false', { userId })
      .execute();

    return { message: 'Todas las notificaciones marcadas como leidas' };
  }

  async dismissDialog(userId: string, notificationId: string) {
    const userNotif = await this.userNotifRepo.findOne({
      where: { userId, notificationId },
    });
    if (!userNotif) {
      throw new NotFoundException('Notificacion de usuario no encontrada');
    }

    userNotif.isDismissed = true;
    return this.userNotifRepo.save(userNotif);
  }

  async getUnreadCount(userId: string) {
    const count = await this.userNotifRepo.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async getPendingDialogs(userId: string) {
    const userNotifs = await this.userNotifRepo.find({
      where: { userId, isDismissed: false },
      order: { createdAt: 'DESC' },
    });

    if (userNotifs.length === 0) return [];

    const notifIds = userNotifs.map((un) => un.notificationId);
    const notifications = await this.notifRepo.find({
      where: { id: In(notifIds), isActive: true },
    });

    const dialogNotifs = notifications.filter(
      (n) => n.type === 'dialog' || n.type === 'both',
    );
    const dialogIds = new Set(dialogNotifs.map((n) => n.id));
    const notifMap = new Map(dialogNotifs.map((n) => [n.id, n]));

    return userNotifs
      .filter((un) => dialogIds.has(un.notificationId))
      .map((un) => {
        const notif = notifMap.get(un.notificationId);
        return {
          id: un.id,
          notificationId: un.notificationId,
          title: notif.title,
          message: notif.message,
          priority: notif.priority,
          actionUrl: notif.actionUrl,
          actionLabel: notif.actionLabel,
          createdAt: un.createdAt,
        };
      });
  }

  async registerFcmToken(
    userId: string,
    token: string,
    platform: string,
    appName?: string,
  ) {
    if (!token || !platform) {
      throw new BadRequestException('token y platform son requeridos');
    }

    // Deactivate existing token if it exists for another user
    await this.fcmRepo.update(
      { token, isActive: true },
      { isActive: false },
    );

    // Check if this user already has this token
    const existing = await this.fcmRepo.findOne({
      where: { userId, token },
    });

    if (existing) {
      existing.isActive = true;
      existing.platform = platform;
      existing.appName = appName || null;
      return this.fcmRepo.save(existing);
    }

    const fcmToken = this.fcmRepo.create({
      userId,
      token,
      platform,
      appName: appName || null,
    });
    return this.fcmRepo.save(fcmToken);
  }

  async unregisterFcmToken(token: string) {
    if (!token) {
      throw new BadRequestException('token es requerido');
    }

    await this.fcmRepo.update({ token, isActive: true }, { isActive: false });
    return { message: 'Token desregistrado' };
  }

  // ── Internal ──

  private async sendNotification(notification: Notification) {
    // 1. Determine recipient user IDs
    const recipientIds = await this.getRecipientIds(notification);

    if (recipientIds.length === 0) return;

    // 2. Create UserNotification records
    const userNotifications = recipientIds.map((userId) =>
      this.userNotifRepo.create({
        notificationId: notification.id,
        userId,
      }),
    );
    await this.userNotifRepo.save(userNotifications);

    // 3. Send push notifications
    const notifType = notification.type;
    if (notifType === 'push' || notifType === 'both') {
      await this.sendPushToRecipients(notification, recipientIds);
    }

    // 4. Mark as sent
    notification.sentAt = new Date();
    await this.notifRepo.save(notification);

    // 5. Publish event via RabbitMQ
    this.messaging.publish('notification.sent', {
      notificationId: notification.id,
      recipientCount: recipientIds.length,
      type: notification.type,
      priority: notification.priority,
    });
  }

  private async getRecipientIds(notification: Notification): Promise<string[]> {
    switch (notification.targetType) {
      case 'all': {
        const users = await this.userRepo.find({
          where: { isActive: true },
          select: ['id'],
        });
        return users.map((u) => u.id);
      }
      case 'role': {
        if (!notification.targetValue) return [];
        const users = await this.userRepo.find({
          where: { role: notification.targetValue as UserRole, isActive: true },
          select: ['id'],
        });
        return users.map((u) => u.id);
      }
      case 'user': {
        if (!notification.targetValue) return [];
        return notification.targetValue
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
      }
      case 'app': {
        // For app-targeted, send to all users (filtering happens at FCM token level)
        const users = await this.userRepo.find({
          where: { isActive: true },
          select: ['id'],
        });
        return users.map((u) => u.id);
      }
      default:
        return [];
    }
  }

  private async sendPushToRecipients(
    notification: Notification,
    recipientIds: string[],
  ) {
    const tokenQuery = this.fcmRepo
      .createQueryBuilder('t')
      .where('t.userId IN (:...userIds)', { userIds: recipientIds })
      .andWhere('t.isActive = true');

    // Filter by target apps if specified
    if (notification.targetApps && notification.targetApps.length > 0) {
      tokenQuery.andWhere('t.appName IN (:...apps)', {
        apps: notification.targetApps,
      });
    }

    const fcmTokens = await tokenQuery.getMany();
    const tokens = fcmTokens.map((t) => t.token);

    if (tokens.length === 0) return;

    const data: Record<string, string> = {
      notificationId: notification.id,
      type: notification.type,
      priority: notification.priority,
    };
    if (notification.actionUrl) {
      data.actionUrl = notification.actionUrl;
    }

    // Firebase sendEachForMulticast supports up to 500 tokens per call
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      await this.firebasePush.sendPush(
        batch,
        notification.title,
        notification.message,
        data,
      );
    }
  }
}
