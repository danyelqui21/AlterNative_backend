import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Event,
  EventStatus,
} from '../../../../../events-service/src/app/entities/event.entity';
import { TicketType } from '../../../../../events-service/src/app/entities/ticket-type.entity';
import { MessagingService } from '@lagunapp-backend/messaging';

@Injectable()
export class AdminEventsGatewayService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
    private readonly messagingService: MessagingService,
  ) {}

  async findAll(filters: {
    status?: string;
    category?: string;
    city?: string;
    organizerId?: string;
    dateFrom?: string;
    dateTo?: string;
    isFeatured?: string;
    isPlusEighteen?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketType');

    if (filters.status) {
      const validStatuses = Object.values(EventStatus);
      if (!validStatuses.includes(filters.status as EventStatus)) {
        throw new BadRequestException(`Estado invalido: ${filters.status}`);
      }
      qb.andWhere('event.status = :status', { status: filters.status });
    }
    if (filters.category) {
      qb.andWhere('event.category = :category', { category: filters.category });
    }
    if (filters.city) {
      qb.andWhere('event.city = :city', { city: filters.city });
    }
    if (filters.organizerId) {
      qb.andWhere('event.organizerId = :organizerId', {
        organizerId: filters.organizerId,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('event.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('event.date <= :dateTo', { dateTo: filters.dateTo });
    }
    if (filters.isFeatured !== undefined) {
      const isFeatured = filters.isFeatured === 'true';
      qb.andWhere('event.isFeatured = :isFeatured', { isFeatured });
    }
    if (filters.isPlusEighteen !== undefined) {
      const isPlusEighteen = filters.isPlusEighteen === 'true';
      qb.andWhere('event.isPlusEighteen = :isPlusEighteen', { isPlusEighteen });
    }
    if (filters.search) {
      qb.andWhere('event.title ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('event.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: ['ticketTypes'],
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    return event;
  }

  async create(dto: Record<string, unknown>) {
    const { ticketTypes, ...eventData } = dto;

    if (!eventData.title) {
      throw new BadRequestException('title es requerido');
    }
    if (!eventData.description) {
      throw new BadRequestException('description es requerido');
    }
    if (!eventData.category) {
      throw new BadRequestException('category es requerido');
    }
    if (!eventData.date) {
      throw new BadRequestException('date es requerido');
    }
    if (!eventData.time) {
      throw new BadRequestException('time es requerido');
    }
    if (!eventData.location) {
      throw new BadRequestException('location es requerido');
    }
    if (!eventData.city) {
      throw new BadRequestException('city es requerido');
    }
    if (eventData.price === undefined || eventData.price === null) {
      throw new BadRequestException('price es requerido');
    }
    if (!eventData.capacity) {
      throw new BadRequestException('capacity es requerido');
    }
    if (!eventData.organizerId) {
      throw new BadRequestException('organizerId es requerido');
    }

    const event = this.eventRepo.create({
      ...eventData,
      status: EventStatus.DRAFT,
    } as Partial<Event>);

    if (Array.isArray(ticketTypes) && ticketTypes.length) {
      event.ticketTypes = (ticketTypes as Partial<TicketType>[]).map((tt) =>
        this.ticketTypeRepo.create(tt),
      );
    }

    return this.eventRepo.save(event);
  }

  async update(id: string, dto: Record<string, unknown>) {
    const event = await this.findOne(id);
    const { ticketTypes, ...eventData } = dto;

    Object.assign(event, eventData);

    if (Array.isArray(ticketTypes)) {
      event.ticketTypes = (ticketTypes as Partial<TicketType>[]).map((tt) =>
        this.ticketTypeRepo.create(tt),
      );
    }

    return this.eventRepo.save(event);
  }

  async toggleFeatured(id: string) {
    const event = await this.findOne(id);
    event.isFeatured = !event.isFeatured;
    return this.eventRepo.save(event);
  }

  async cancel(id: string) {
    const event = await this.findOne(id);
    event.status = EventStatus.CANCELLED;
    const saved = await this.eventRepo.save(event);

    await this.messagingService.publish('event.cancelled', {
      eventId: event.id,
      title: event.title,
      organizerId: event.organizerId,
    });

    return saved;
  }

  async activate(id: string) {
    const event = await this.findOne(id);
    event.status = EventStatus.ACTIVE;
    return this.eventRepo.save(event);
  }

  async getStats() {
    const qb = this.eventRepo.createQueryBuilder('event');

    const total = await qb.getCount();

    const statusCounts = await this.eventRepo
      .createQueryBuilder('event')
      .select('event.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.status')
      .getRawMany();

    const stats: Record<string, number> = {
      total,
      active: 0,
      completed: 0,
      cancelled: 0,
      draft: 0,
    };

    for (const row of statusCounts) {
      stats[row.status] = Number(row.count);
    }

    const ticketStats = await this.eventRepo
      .createQueryBuilder('event')
      .select('SUM(event.ticketsSold)', 'totalTicketsSold')
      .addSelect('SUM(event.ticketsSold * event.price)', 'totalRevenue')
      .getRawOne();

    stats.totalTicketsSold = Number(ticketStats?.totalTicketsSold) || 0;
    stats.totalRevenue = Number(ticketStats?.totalRevenue) || 0;

    return stats;
  }
}
