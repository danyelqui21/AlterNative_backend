import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clan } from '../../../../../clans-service/src/app/entities/clan.entity';
import { ClanMember, ClanMemberRole } from '../../../../../clans-service/src/app/entities/clan-member.entity';
import { ClanMessage, ClanMessageType } from '../../../../../clans-service/src/app/entities/clan-message.entity';
import { ClanCreationConfig } from '../../../../../clans-service/src/app/entities/clan-creation-config.entity';
import { User, UserRole } from '../../../../../auth-service/src/app/entities/user.entity';

@Injectable()
export class ClansGatewayService {
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

    if (filters.city) qb.andWhere('clan.city = :city', { city: filters.city });
    if (filters.category) qb.andWhere('clan.category = :category', { category: filters.category });
    if (filters.search) {
      qb.andWhere('(clan.name ILIKE :search OR clan.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('clan.createdAt', 'DESC').offset(skip).limit(limit);
    const { raw, entities } = await qb.getRawAndEntities();

    return entities.map((clan, i) => ({
      ...clan,
      memberCount: parseInt(raw[i]?.memberCount || '0', 10),
    }));
  }

  async findOne(id: string) {
    const clan = await this.clanRepo.findOne({
      where: { id, isActive: true },
      relations: ['members'],
    });
    if (!clan) throw new NotFoundException('Clan no encontrado');

    const userIds = clan.members.map((m) => m.userId);
    const users = userIds.length
      ? await this.userRepo.createQueryBuilder('user')
          .select(['user.id', 'user.name', 'user.avatarUrl'])
          .whereInIds(userIds).getMany()
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
    return memberships.filter((m) => m.clan?.isActive).map((m) => m.clan);
  }

  async create(dto: Record<string, unknown>, userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.role !== UserRole.ORGANIZER && !user.canCreateClans) {
      throw new ForbiddenException('No tienes permiso para crear clanes');
    }

    const maxClansConfig = await this.configRepo.findOne({ where: { key: 'maxClansPerUser' } });
    const maxClans = parseInt(maxClansConfig?.value || '2', 10);
    const createdCount = await this.clanRepo.count({ where: { creatorId: userId, isActive: true } });
    if (createdCount >= maxClans) {
      throw new ForbiddenException(`Has alcanzado el limite de ${maxClans} clanes`);
    }

    const clan = this.clanRepo.create({ ...(dto as Partial<Clan>), creatorId: userId });
    const saved = await this.clanRepo.save(clan);

    const member = this.memberRepo.create({
      clanId: saved.id,
      userId,
      role: ClanMemberRole.ADMIN,
    });
    await this.memberRepo.save(member);

    return saved;
  }

  async update(id: string, dto: Record<string, unknown>, userId: string) {
    const clan = await this.clanRepo.findOne({ where: { id } });
    if (!clan) throw new NotFoundException('Clan no encontrado');

    const isAdmin = await this.memberRepo.findOne({
      where: { clanId: id, userId, role: ClanMemberRole.ADMIN },
    });
    if (!isAdmin) throw new ForbiddenException('Solo el admin puede editar el clan');

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

  async join(clanId: string, userId: string) {
    const clan = await this.clanRepo.findOne({ where: { id: clanId, isActive: true } });
    if (!clan) throw new NotFoundException('Clan no encontrado');

    const currentCount = await this.memberRepo.count({ where: { clanId } });
    if (currentCount >= clan.maxMembers) throw new ConflictException('El clan esta lleno');

    const existing = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (existing) throw new ConflictException('Ya eres miembro de este clan');

    const member = this.memberRepo.create({ clanId, userId, role: ClanMemberRole.MEMBER });
    await this.memberRepo.save(member);
    return { message: 'Te has unido al clan' };
  }

  async leave(clanId: string, userId: string) {
    const membership = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (!membership) throw new NotFoundException('No eres miembro de este clan');
    await this.memberRepo.remove(membership);
    return { message: 'Has salido del clan' };
  }

  async getMessages(clanId: string, userId: string, page = 1) {
    const isMember = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (!isMember) throw new ForbiddenException('No eres miembro de este clan');

    const limit = 50;
    const skip = (page - 1) * limit;
    const messages = await this.messageRepo.find({
      where: { clanId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = senderIds.length
      ? await this.userRepo.createQueryBuilder('user')
          .select(['user.id', 'user.name', 'user.avatarUrl'])
          .whereInIds(senderIds).getMany()
      : [];
    const senderMap = new Map(senders.map((u) => [u.id, u]));

    return messages.map((m) => ({
      ...m,
      senderName: senderMap.get(m.senderId)?.name || 'Usuario',
      senderAvatarUrl: senderMap.get(m.senderId)?.avatarUrl || null,
    }));
  }

  async sendMessage(clanId: string, userId: string, dto: Record<string, unknown>) {
    const isMember = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (!isMember) throw new ForbiddenException('No eres miembro de este clan');

    const message = this.messageRepo.create({
      clanId,
      senderId: userId,
      content: dto.content as string,
      type: (dto.type as ClanMessageType) || ClanMessageType.TEXT,
      eventId: (dto.eventId as string) || null,
    });
    return this.messageRepo.save(message);
  }

  async shareEvent(userId: string, dto: Record<string, unknown>) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const userName = user?.name || 'Un miembro';
    const eventId = dto.eventId as string;
    const clanIds = dto.clanIds as string[];

    const messages: ClanMessage[] = [];
    for (const clanId of clanIds) {
      const isMember = await this.memberRepo.findOne({ where: { clanId, userId } });
      if (!isMember) continue;

      const message = this.messageRepo.create({
        clanId,
        senderId: userId,
        content: `${userName} compartio un evento que le interesa`,
        type: ClanMessageType.EVENT_SHARE,
        eventId,
      });
      messages.push(message);
    }
    return this.messageRepo.save(messages);
  }

  async ticketPurchaseShare(clanId: string, userId: string, eventId: string) {
    const isMember = await this.memberRepo.findOne({ where: { clanId, userId } });
    if (!isMember) throw new ForbiddenException('No eres miembro de este clan');

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

  async canCreate(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const canCreate = user.role === UserRole.ORGANIZER || user.canCreateClans;
    const maxClansConfig = await this.configRepo.findOne({ where: { key: 'maxClansPerUser' } });
    const maxClans = parseInt(maxClansConfig?.value || '2', 10);
    const clansCreated = await this.clanRepo.count({ where: { creatorId: userId, isActive: true } });

    return { canCreate, clansCreated, maxClans };
  }
}
