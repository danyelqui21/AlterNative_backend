import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Ticket } from '../entities/ticket.entity';
import { Payment } from '../entities/payment.entity';
import { DEFAULT_CURRENCY, QR_CODE_PREFIX } from '../constants';
import { Event } from '../../../../../events-service/src/app/entities/event.entity';
import { TicketType } from '../../../../../events-service/src/app/entities/ticket-type.entity';

@Injectable()
export class TicketsGatewayService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
  ) {}

  // ── Admin ──

  async findAll(filters: {
    status?: string;
    userId?: string;
    eventId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.isActive = :isActive', { isActive: true });

    if (filters.status) {
      qb.andWhere('ticket.status = :status', { status: filters.status });
    }
    if (filters.userId) {
      qb.andWhere('ticket.userId = :userId', { userId: filters.userId });
    }
    if (filters.eventId) {
      qb.andWhere('ticket.eventId = :eventId', { eventId: filters.eventId });
    }
    if (filters.search) {
      qb.andWhere(
        '(ticket.eventTitle ILIKE :search OR ticket.ticketTypeName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('ticket.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id, isActive: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    return ticket;
  }

  async cancel(id: string) {
    const ticket = await this.findOne(id);
    ticket.status = 'cancelled';
    return this.ticketRepo.save(ticket);
  }

  async refund(id: string) {
    const ticket = await this.findOne(id);
    ticket.status = 'refunded';
    return this.ticketRepo.save(ticket);
  }

  async use(id: string) {
    const ticket = await this.findOne(id);
    if (ticket.status !== 'active') {
      throw new BadRequestException('Solo tickets activos pueden ser usados');
    }
    ticket.status = 'used';
    return this.ticketRepo.save(ticket);
  }

  async stats() {
    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.isActive = :isActive', { isActive: true });

    const total = await qb.getCount();

    const active = await this.ticketRepo.count({
      where: { status: 'active', isActive: true },
    });
    const used = await this.ticketRepo.count({
      where: { status: 'used', isActive: true },
    });
    const cancelled = await this.ticketRepo.count({
      where: { status: 'cancelled', isActive: true },
    });
    const refunded = await this.ticketRepo.count({
      where: { status: 'refunded', isActive: true },
    });

    const { totalRevenue } = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('COALESCE(SUM(ticket.price * ticket.quantity), 0)', 'totalRevenue')
      .where('ticket.isActive = :isActive', { isActive: true })
      .where('ticket.status IN (:...statuses)', {
        statuses: ['active', 'used'],
      })
      .getRawOne();

    return {
      total,
      active,
      used,
      cancelled,
      refunded,
      totalRevenue: Number(totalRevenue),
    };
  }

  // ── Public ──

  async findMyTickets(userId: string) {
    return this.ticketRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async purchase(
    userId: string,
    dto: { eventId: string; ticketTypeId: string; quantity?: number },
  ) {
    const { eventId, ticketTypeId } = dto;
    const quantity = dto.quantity || 1;

    if (quantity < 1) {
      throw new BadRequestException('La cantidad debe ser al menos 1');
    }

    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const ticketType = await this.ticketTypeRepo.findOne({
      where: { id: ticketTypeId },
    });
    if (!ticketType) {
      throw new NotFoundException('Tipo de ticket no encontrado');
    }

    const ticket = this.ticketRepo.create({
      userId,
      eventId,
      ticketTypeId,
      eventTitle: event.title,
      ticketTypeName: ticketType.name,
      price: ticketType.price,
      quantity,
      status: 'active',
      qrCode: `${QR_CODE_PREFIX}-${randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`,
    });

    const savedTicket = await this.ticketRepo.save(ticket);

    // Increment ticketsSold on the event
    await this.eventRepo.increment({ id: eventId }, 'ticketsSold', quantity);

    return savedTicket;
  }

  async buy(
    userId: string,
    dto: { eventId: string; ticketTypeId: string; quantity?: number },
  ) {
    const { eventId, ticketTypeId } = dto;
    const quantity = dto.quantity || 1;

    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');

    const ticketType = await this.ticketTypeRepo.findOne({
      where: { id: ticketTypeId },
    });
    if (!ticketType) throw new NotFoundException('Tipo de ticket no encontrado');

    const totalAmount = Number(ticketType.price) * quantity;

    // TODO: Replace with Stripe payment intent + webhook flow when payment processor is configured.
    // Currently every purchase is auto-approved without charging a real card.
    const payment = this.paymentRepo.create({
      userId,
      amount: totalAmount,
      currency: DEFAULT_CURRENCY,
      status: 'succeeded',
      description: `${quantity}x ${ticketType.name} — ${event.title}`,
      referenceType: 'ticket',
      referenceId: ticketTypeId,
    });
    await this.paymentRepo.save(payment);

    const ticket = this.ticketRepo.create({
      userId,
      eventId,
      ticketTypeId,
      eventTitle: event.title,
      ticketTypeName: ticketType.name,
      price: ticketType.price,
      quantity,
      status: 'active',
      qrCode: `${QR_CODE_PREFIX}-${randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`,
    });
    await this.ticketRepo.save(ticket);

    await this.eventRepo.increment({ id: eventId }, 'ticketsSold', quantity);

    return { payment, ticket };
  }
}
