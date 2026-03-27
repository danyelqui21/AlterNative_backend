import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { TicketType } from './entities/ticket-type.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventsDto } from './dto/filter-events.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>
  ) {}

  async findAll(filters: FilterEventsDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketType')
      .where('event.status = :status', { status: EventStatus.ACTIVE });

    if (filters.category) {
      qb.andWhere('event.category = :category', {
        category: filters.category,
      });
    }

    if (filters.city) {
      qb.andWhere('event.city = :city', { city: filters.city });
    }

    if (filters.dateFrom) {
      qb.andWhere('event.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('event.date <= :dateTo', { dateTo: filters.dateTo });
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

    return {
      data: events,
      meta: { total, page, limit },
    };
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

  async create(dto: CreateEventDto, organizerId: string) {
    const event = this.eventRepo.create({
      ...dto,
      organizerId,
      status: EventStatus.ACTIVE,
    });

    if (dto.ticketTypes?.length) {
      event.ticketTypes = dto.ticketTypes.map((tt) =>
        this.ticketTypeRepo.create(tt)
      );
    }

    return this.eventRepo.save(event);
  }

  async update(id: string, dto: UpdateEventDto, organizerId: string) {
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
