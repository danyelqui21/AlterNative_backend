import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clan } from './entities/clan.entity';
import { ClanMember, ClanMemberRole } from './entities/clan-member.entity';
import { ClanMessage, ClanMessageType } from './entities/clan-message.entity';
import { ClanCreationConfig } from './entities/clan-creation-config.entity';
// Import User entity from auth-service (resolved at runtime via shared DB)
import { User } from '../../../auth-service/src/app/entities/user.entity';

const UserRole = { ORGANIZER: 'organizer' } as const;
import { CreateClanDto } from './dto/create-clan.dto';
import { UpdateClanDto } from './dto/update-clan.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ShareEventDto } from './dto/share-event.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Clan)
    private readonly clanRepo: Repository<Clan>,
    @InjectRepository(ClanMember)
    private readonly memberRepo: Repository<ClanMember>,
    @InjectRepository(ClanMessage)
    private readonly messageRepo: Repository<ClanMessage>,
    @InjectRepository(ClanCreationConfig)
    private readonly configRepo: Repository<ClanCreationConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Clans CRUD ────────────────────────────────────────────────────────────

  async findAll(filters: {
    city?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.clanRepo
      .createQueryBuilder('clan')
      .leftJoin('clan.members', 'member')
      .addSelect('COUNT(member.id)', 'memberCount')
      .where('clan.isActive = true')
      .groupBy('clan.id');

    if (filters.city) {
      qb.andWhere('clan.city = :city', { city: filters.city });
    }
    if (filters.category) {
      qb.andWhere('clan.category = :category', { category: filters.category });
    }
    if (filters.search) {
      qb.andWhere('(clan.name ILIKE :search OR clan.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('clan.createdAt', 'DESC').offset(skip).limit(limit);
    const { raw, entities } = await qb.getRawAndEntities();

    const clans = entities.map((clan, i) => ({
      ...clan,
      memberCount: parseInt(raw[i]?.memberCount || '0', 10),
    }));

    return clans;
  }

  async findOne(id: string) {
    const clan = await this.clanRepo.findOne({
      where: { id, isActive: true },
      relations: ['members'],
    });
    if (!clan) {
      throw new NotFoundException('Clan no encontrado');
    }

    // Enrich members with user names
    const userIds = clan.members.map((m) => m.userId);
    const users = userIds.length
      ? await this.userRepo
          .createQueryBuilder('user')
          .select(['user.id', 'user.name', 'user.avatarUrl'])
          .whereInIds(userIds)
          .getMany()
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      ...clan,
      members: clan.members.map((m) => ({
        ...m,
        userName: userMap.get(m.userId)?.name || 'Usuario',
        userAvatarUrl: userMap.get(m.userId)?.avatarUrl || null,
      })),
    };
  }

  async myClans(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['clan'],
    });

    return memberships
      .filter((m) => m.clan?.isActive)
      .map((m) => m.clan);
  }

  async create(dto: CreateClanDto, userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Permission check: organizers always can, others need canCreateClans
    if (user.role !== UserRole.ORGANIZER && !user.canCreateClans) {
      throw new ForbiddenException('No tienes permiso para crear clanes');
    }

    // Check max clans per user
    const maxClansConfig = await this.getConfig('maxClansPerUser', '2');
    const maxClans = parseInt(maxClansConfig, 10);
    const createdCount = await this.clanRepo.count({ where: { creatorId: userId, isActive: true } });
    if (createdCount >= maxClans) {
      throw new ForbiddenException(`Has alcanzado el limite de ${maxClans} clanes que puedes crear`);
    }

    const clan = this.clanRepo.create({
      ...dto,
      creatorId: userId,
    });
    const saved = await this.clanRepo.save(clan);

    // Creator auto-joins as admin
    const member = this.memberRepo.create({
      clanId: saved.id,
      userId,
      role: ClanMemberRole.ADMIN,
    });
    await this.memberRepo.save(member);

    return saved;
  }

  async update(id: string, dto: UpdateClanDto, userId: string) {
    const clan = await this.clanRepo.findOne({ where: { id } });
    if (!clan) throw new NotFoundException('Clan no encontrado');

    const isAdmin = await this.memberRepo.findOne({
      where: { clanId: id, userId, role: ClanMemberRole.ADMIN },
    });
    if (!isAdmin) {
      throw new ForbiddenException('Solo el admin puede editar el clan');
    }

    Object.assign(clan, dto);
    return this.clanRepo.save(clan);
  }

  async delete(id: string, userId: string) {
    const clan = await this.clanRepo.findOne({ where: { id } });
    if (!clan) throw new NotFoundException('Clan no encontrado');
    if (clan.creatorId !== userId) {
      throw new ForbiddenException('Solo el creador puede eliminar el clan');
    }

    clan.isActive = false;
    return this.clanRepo.save(clan);
  }

  // ── Membership ────────────────────────────────────────────────────────────

  async join(clanId: string, userId: string) {
    const clan = await this.clanRepo.findOne({ where: { id: clanId, isActive: true } });
    if (!clan) throw new NotFoundException('Clan no encontrado');

    const currentCount = await this.memberRepo.count({ where: { clanId } });
    if (currentCount >= clan.maxMembers) {
      throw new ConflictException('El clan esta lleno');
    }

    const existing = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (existing) {
      throw new ConflictException('Ya eres miembro de este clan');
    }

    const member = this.memberRepo.create({
      clanId,
      userId,
      role: ClanMemberRole.MEMBER,
    });
    await this.memberRepo.save(member);

    return { message: 'Te has unido al clan' };
  }

  async leave(clanId: string, userId: string) {
    const membership = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (!membership) {
      throw new NotFoundException('No eres miembro de este clan');
    }

    await this.memberRepo.remove(membership);
    return { message: 'Has salido del clan' };
  }

  // ── Chat / Messages ───────────────────────────────────────────────────────

  async getMessages(clanId: string, userId: string, page = 1, limit = 50) {
    // Verify membership
    const isMember = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (!isMember) {
      throw new ForbiddenException('No eres miembro de este clan');
    }

    const skip = (page - 1) * limit;
    const messages = await this.messageRepo.find({
      where: { clanId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Enrich with sender names
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = senderIds.length
      ? await this.userRepo
          .createQueryBuilder('user')
          .select(['user.id', 'user.name', 'user.avatarUrl'])
          .whereInIds(senderIds)
          .getMany()
      : [];
    const senderMap = new Map(senders.map((u) => [u.id, u]));

    return messages.map((m) => ({
      ...m,
      senderName: senderMap.get(m.senderId)?.name || 'Usuario',
      senderAvatarUrl: senderMap.get(m.senderId)?.avatarUrl || null,
    }));
  }

  async sendMessage(clanId: string, userId: string, dto: SendMessageDto) {
    const isMember = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (!isMember) {
      throw new ForbiddenException('No eres miembro de este clan');
    }

    const message = this.messageRepo.create({
      clanId,
      senderId: userId,
      content: dto.content,
      type: dto.type || ClanMessageType.TEXT,
      eventId: dto.eventId || null,
    });
    return this.messageRepo.save(message);
  }

  async shareEvent(userId: string, dto: ShareEventDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const userName = user?.name || 'Un miembro';

    const messages: ClanMessage[] = [];
    for (const clanId of dto.clanIds) {
      const isMember = await this.memberRepo.findOne({ where: { clanId, userId } });
      if (!isMember) continue;

      const message = this.messageRepo.create({
        clanId,
        senderId: userId,
        content: `${userName} compartio un evento que le interesa`,
        type: ClanMessageType.EVENT_SHARE,
        eventId: dto.eventId,
      });
      messages.push(message);
    }

    return this.messageRepo.save(messages);
  }

  async ticketPurchaseShare(clanId: string, userId: string, eventId: string) {
    const isMember = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (!isMember) {
      throw new ForbiddenException('No eres miembro de este clan');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    const userName = user?.name || 'Un miembro';

    const message = this.messageRepo.create({
      clanId,
      senderId: userId,
      content: `${userName} acaba de comprar un boleto. Es mejor en compania, animense a acompanarlo!`,
      type: ClanMessageType.TICKET_PURCHASE,
      eventId,
    });
    return this.messageRepo.save(message);
  }

  // ── Permission Check ──────────────────────────────────────────────────────

  async canCreate(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const canCreate = user.role === UserRole.ORGANIZER || user.canCreateClans;
    const maxClansConfig = await this.getConfig('maxClansPerUser', '2');
    const maxClans = parseInt(maxClansConfig, 10);
    const clansCreated = await this.clanRepo.count({ where: { creatorId: userId, isActive: true } });

    return { canCreate, clansCreated, maxClans };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async getConfig(key: string, defaultValue: string): Promise<string> {
    const config = await this.configRepo.findOne({ where: { key } });
    return config?.value || defaultValue;
  }
}
