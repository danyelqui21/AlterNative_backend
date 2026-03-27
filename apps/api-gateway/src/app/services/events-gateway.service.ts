import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Event,
  EventStatus,
} from '../../../../../events-service/src/app/entities/event.entity';
import { TicketType } from '../../../../../events-service/src/app/entities/ticket-type.entity';

@Injectable()
export class EventsGatewayService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>
  ) {}

  async findAll(filters: {
    filter?: string;
    category?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    priceMin?: number;
    priceMax?: number;
    isPlusEighteen?: boolean;
    isFeatured?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketType')
      .where('event.status = :status', { status: EventStatus.ACTIVE });

    // Server-side "today" / "week" filter using the server's local clock
    if (filters.filter === 'today') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      qb.andWhere('event.date >= :start AND event.date <= :end', { start, end });
    } else if (filters.filter === 'week') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59);
      qb.andWhere('event.date >= :start AND event.date <= :end', { start, end });
    } else {
      if (filters.dateFrom) {
        qb.andWhere('event.date >= :dateFrom', { dateFrom: filters.dateFrom });
      }
      if (filters.dateTo) {
        qb.andWhere('event.date <= :dateTo', { dateTo: filters.dateTo });
      }
    }

    if (filters.category) {
      qb.andWhere('event.category = :category', {
        category: filters.category,
      });
    }
    if (filters.city) {
      qb.andWhere('event.city = :city', { city: filters.city });
    }
    if (filters.isFeatured !== undefined) {
      const isFeatured = filters.isFeatured === true || (filters.isFeatured as any) === 'true';
      qb.andWhere('event.isFeatured = :isFeatured', { isFeatured });
    }
    if (filters.priceMin !== undefined) {
      qb.andWhere('event.price >= :priceMin', { priceMin: filters.priceMin });
    }
    if (filters.priceMax !== undefined) {
      qb.andWhere('event.price <= :priceMax', { priceMax: filters.priceMax });
    }
    if (filters.isPlusEighteen !== undefined) {
      qb.andWhere('event.isPlusEighteen = :isPlusEighteen', {
        isPlusEighteen: filters.isPlusEighteen,
      });
    }

    qb.orderBy('event.date', 'ASC').skip(skip).take(limit);
    const [events, total] = await qb.getManyAndCount();

    return { data: events, meta: { total, page, limit } };
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

  async findFeatured() {
    return this.eventRepo.find({
      where: { isFeatured: true, status: EventStatus.ACTIVE },
      relations: ['ticketTypes'],
      order: { date: 'ASC' },
      take: 10,
    });
  }

  async create(dto: Record<string, unknown>, organizerId: string) {
    const { ticketTypes, ...eventData } = dto;
    const event = this.eventRepo.create({
      ...eventData,
      organizerId,
      status: EventStatus.ACTIVE,
    } as Partial<Event>);

    if (Array.isArray(ticketTypes) && ticketTypes.length) {
      event.ticketTypes = (ticketTypes as Partial<TicketType>[]).map((tt) =>
        this.ticketTypeRepo.create(tt)
      );
    }

    return this.eventRepo.save(event);
  }

  async update(
    id: string,
    dto: Record<string, unknown>,
    organizerId: string
  ) {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'No tienes permiso para editar este evento'
      );
    }

    Object.assign(event, dto);
    return this.eventRepo.save(event);
  }

  async delete(id: string, organizerId: string) {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este evento'
      );
    }

    event.status = EventStatus.CANCELLED;
    return this.eventRepo.save(event);
  }
}
