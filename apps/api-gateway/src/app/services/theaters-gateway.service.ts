import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { DEFAULT_CURRENCY, QR_CODE_PREFIX } from '../constants';
import { Theater } from '../entities/theater.entity';
import { SeatingLayout } from '../entities/seating-layout.entity';
import { Seat } from '../entities/seat.entity';
import { TheaterEvent, SeatingMode } from '../entities/theater-event.entity';
import { SeatReservation } from '../entities/seat-reservation.entity';
import { Payment } from '../entities/payment.entity';
import { Ticket } from '../entities/ticket.entity';
import { Event } from '../../../../../events-service/src/app/entities/event.entity';
import { SeatReservationService } from './seat-reservation.service';
import { SeatsGateway } from '../gateways/seats.gateway';

@Injectable()
export class TheatersGatewayService {
  constructor(
    @InjectRepository(Theater)
    private readonly theaterRepo: Repository<Theater>,
    @InjectRepository(SeatingLayout)
    private readonly layoutRepo: Repository<SeatingLayout>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
    @InjectRepository(TheaterEvent)
    private readonly theaterEventRepo: Repository<TheaterEvent>,
    @InjectRepository(SeatReservation)
    private readonly reservationRepo: Repository<SeatReservation>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly seatHoldService: SeatReservationService,
    private readonly seatsGateway: SeatsGateway,
  ) {}

  // ════════════════════════════════════════════
  //  ADMIN — Theater CRUD
  // ════════════════════════════════════════════

  async findAll(filters: {
    search?: string;
    city?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.theaterRepo
      .createQueryBuilder('theater')
      .where('theater.isActive = :isActive', { isActive: true });

    if (filters.search) {
      qb.andWhere(
        '(theater.name ILIKE :search OR theater.address ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters.city) {
      qb.andWhere('theater.city = :city', { city: filters.city });
    }

    qb.leftJoinAndSelect('theater.layouts', 'layout', 'layout.isActive = true')
      .orderBy('theater.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const theater = await this.theaterRepo.findOne({
      where: { id, isActive: true },
      relations: ['layouts'],
    });
    if (!theater) throw new NotFoundException('Teatro no encontrado');
    // Filter out inactive layouts
    theater.layouts = (theater.layouts || []).filter((l) => l.isActive);
    return theater;
  }

  /**
   * Get all events linked to a theater (via theater_events table).
   * Returns full event data with seatingMode.
   */
  async getEventsForTheater(theaterId: string) {
    const theaterEvents = await this.theaterEventRepo.find({
      where: { theaterId, isActive: true },
    });

    if (theaterEvents.length === 0) return [];

    const eventIds = theaterEvents.map((te) => te.eventId);
    const events = await this.eventRepo
      .createQueryBuilder('event')
      .where('event.id IN (:...eventIds)', { eventIds })
      .andWhere('event.status = :status', { status: 'active' })
      .orderBy('event.date', 'ASC')
      .getMany();

    // Merge seatingMode into each event
    const teMap = new Map(theaterEvents.map((te) => [te.eventId, te]));
    return events.map((e) => {
      const te = teMap.get(e.id);
      return {
        ...e,
        seatingMode: te?.seatingMode || 'general',
        theaterEventId: te?.id,
        layoutId: te?.layoutId,
      };
    });
  }

  /**
   * Check if an event is a theater event and return its theater info.
   * Returns null if the event is not linked to a theater.
   * This is called by the event detail page to decide whether to show seat selection.
   */
  async getTheaterInfoForEvent(eventId: string) {
    const theaterEvent = await this.theaterEventRepo.findOne({
      where: { eventId, isActive: true },
    });

    if (!theaterEvent) {
      return { isTheaterEvent: false };
    }

    const theater = await this.theaterRepo.findOne({
      where: { id: theaterEvent.theaterId, isActive: true },
    });

    return {
      isTheaterEvent: true,
      seatingMode: theaterEvent.seatingMode,
      theaterId: theaterEvent.theaterId,
      theaterName: theater?.name ?? '',
      theaterEventId: theaterEvent.id,
      layoutId: theaterEvent.layoutId,
      capacity: theater?.capacity ?? 0,
    };
  }

  async create(dto: {
    name: string;
    description: string;
    address: string;
    city: string;
    imageUrl?: string;
    phone?: string;
    managerId: string;
  }) {
    const theater = this.theaterRepo.create(dto);
    return this.theaterRepo.save(theater);
  }

  async update(
    id: string,
    dto: Partial<{
      name: string;
      description: string;
      address: string;
      city: string;
      imageUrl: string;
      phone: string;
    }>,
  ) {
    const theater = await this.findOne(id);
    Object.assign(theater, dto);
    return this.theaterRepo.save(theater);
  }

  async disable(id: string) {
    const theater = await this.findOne(id);
    theater.isActive = false;
    return this.theaterRepo.save(theater);
  }

  async enable(id: string) {
    const theater = await this.theaterRepo.findOne({ where: { id } });
    if (!theater) throw new NotFoundException('Teatro no encontrado');
    theater.isActive = true;
    return this.theaterRepo.save(theater);
  }

  // ════════════════════════════════════��═══════
  //  ADMIN — Seating Layouts
  // ═════════════════════════════════════���══════

  async createLayout(
    theaterId: string,
    dto: {
      name: string;
      description?: string;
      canvasWidth?: number;
      canvasHeight?: number;
      backgroundUrl?: string;
    },
  ) {
    await this.findOne(theaterId);
    const layout = this.layoutRepo.create({ ...dto, theaterId });
    return this.layoutRepo.save(layout);
  }

  async updateLayout(
    theaterId: string,
    layoutId: string,
    dto: Partial<{
      name: string;
      description: string;
      canvasWidth: number;
      canvasHeight: number;
      backgroundUrl: string;
    }>,
  ) {
    const layout = await this.layoutRepo.findOne({
      where: { id: layoutId, theaterId, isActive: true },
    });
    if (!layout) throw new NotFoundException('Layout no encontrado');
    Object.assign(layout, dto);
    return this.layoutRepo.save(layout);
  }

  async getLayoutWithSeats(theaterId: string, layoutId: string) {
    const layout = await this.layoutRepo.findOne({
      where: { id: layoutId, theaterId, isActive: true },
      relations: ['seats'],
    });
    if (!layout) throw new NotFoundException('Layout no encontrado');
    // Return ALL seats (including disabled) — the editor needs to show them
    // Disabled seats have isActive=false and are rendered grayed out
    return layout;
  }

  /**
   * Bulk upsert seats for a layout.
   *
   * Smart sync:
   * - Seats with an existing `id` → update in place (preserves FK references in reservations)
   * - Seats without `id` → create new
   * - Existing seats NOT in the incoming array → soft-delete (isActive=false)
   *
   * This means past events with seatsSnapshot keep working, and
   * seat_reservations still reference valid seat IDs.
   */
  async bulkUpsertSeats(
    theaterId: string,
    layoutId: string,
    seats: Array<{
      id?: string;
      label: string;
      sectionName?: string;
      rowName?: string;
      seatNumber?: number;
      posX: number;
      posY: number;
      angle?: number;
      color?: string;
      backgroundColor?: string;
      seatType?: string;
      price?: number;
      isActive?: boolean;
    }>,
  ) {
    const layout = await this.layoutRepo.findOne({
      where: { id: layoutId, theaterId, isActive: true },
    });
    if (!layout) throw new NotFoundException('Layout no encontrado');

    // Get all current seats for this layout
    const currentSeats = await this.seatRepo.find({ where: { layoutId } });
    const currentIds = new Set(currentSeats.map((s) => s.id));

    // Separate incoming seats into updates vs creates
    const incomingIds = new Set<string>();
    const toUpdate: typeof seats = [];
    const toCreate: typeof seats = [];

    for (const s of seats) {
      if (s.id && currentIds.has(s.id)) {
        incomingIds.add(s.id);
        toUpdate.push(s);
      } else {
        toCreate.push(s);
      }
    }

    // Soft-delete seats that were removed from the editor
    const removedIds = currentSeats
      .filter((s) => !incomingIds.has(s.id))
      .map((s) => s.id);
    if (removedIds.length > 0) {
      await this.seatRepo
        .createQueryBuilder()
        .update()
        .set({ isActive: false })
        .whereInIds(removedIds)
        .execute();
    }

    // Update existing seats (keep their ID, update properties)
    for (const s of toUpdate) {
      await this.seatRepo.update(s.id!, {
        label: s.label,
        sectionName: s.sectionName,
        rowName: s.rowName,
        seatNumber: s.seatNumber,
        posX: s.posX,
        posY: s.posY,
        angle: s.angle ?? 0,
        color: s.color ?? '#D4663F',
        backgroundColor: s.backgroundColor,
        seatType: s.seatType ?? 'standard',
        price: s.price ?? null,
        isActive: s.isActive !== false,
      });
    }

    // Create new seats
    const newEntities = toCreate.map((s) =>
      this.seatRepo.create({ ...s, layoutId, isActive: true }),
    );
    if (newEntities.length > 0) {
      await this.seatRepo.save(newEntities);
    }

    // Update theater capacity
    const totalSeats = await this.seatRepo.count({
      where: { layoutId, isActive: true },
    });
    await this.theaterRepo.update(theaterId, { capacity: totalSeats });

    // Return the current active seats
    return this.seatRepo.find({ where: { layoutId, isActive: true } });
  }

  // ════════════════════════════════════════════
  //  ADMIN — Theater Events
  // ═══════════════════════════════════════════���

  async createTheaterEvent(dto: {
    eventId: string;
    theaterId: string;
    layoutId?: string;
    seatingMode: SeatingMode;
  }) {
    await this.findOne(dto.theaterId);

    if (dto.seatingMode === SeatingMode.NUMBERED && !dto.layoutId) {
      throw new BadRequestException(
        'Un evento con asientos numerados requiere un layout',
      );
    }

    const existing = await this.theaterEventRepo.findOne({
      where: { eventId: dto.eventId, isActive: true },
    });
    if (existing) {
      throw new ConflictException(
        'Este evento ya esta vinculado a un teatro',
      );
    }

    // Snapshot current seats so layout edits don't affect this event
    let seatsSnapshot: any[] | null = null;
    if (dto.layoutId && dto.seatingMode === SeatingMode.NUMBERED) {
      const layout = await this.layoutRepo.findOne({
        where: { id: dto.layoutId, isActive: true },
        relations: ['seats'],
      });
      if (layout?.seats) {
        seatsSnapshot = layout.seats
          .filter((s) => s.isActive)
          .map((s) => ({
            id: s.id,
            label: s.label,
            sectionName: s.sectionName,
            rowName: s.rowName,
            seatNumber: s.seatNumber,
            posX: s.posX,
            posY: s.posY,
            angle: s.angle,
            color: s.color,
            backgroundColor: s.backgroundColor,
            seatType: s.seatType,
            price: s.price ?? null,
            isActive: s.isActive,
          }));
      }
    }

    const theaterEvent = this.theaterEventRepo.create({
      ...dto,
      seatsSnapshot,
    });
    return this.theaterEventRepo.save(theaterEvent);
  }

  async getTheaterEvent(eventId: string) {
    const te = await this.theaterEventRepo.findOne({
      where: { eventId, isActive: true },
    });
    if (!te) throw new NotFoundException('Evento de teatro no encontrado');
    return te;
  }

  // ════════════════════════��═══════════════════
  //  PUBLIC — Seat Availability
  // ════════════════════════════════════════════

  /**
   * Get seat map with real-time availability for a theater event.
   * Uses the frozen snapshot (past events stay immutable) or live layout (if no snapshot).
   * Merges with Redis holds + DB reservations for real-time status.
   */
  async getSeatMap(eventId: string, userId?: string) {
    const theaterEvent = await this.getTheaterEvent(eventId);

    if (theaterEvent.seatingMode !== SeatingMode.NUMBERED) {
      throw new BadRequestException('Este evento no tiene asientos numerados');
    }

    // Use snapshot if available (seats frozen at event creation)
    // Otherwise fall back to live layout (for backward compat or preview)
    let activeSeats: Array<{
      id: string; label: string; sectionName?: string; rowName?: string;
      seatNumber?: number; posX: number; posY: number; angle: number;
      color: string; backgroundColor?: string; seatType: string; price?: number; isActive?: boolean;
    }>;
    let layoutData: { id: string; name: string; canvasWidth: number; canvasHeight: number; backgroundUrl?: string };

    const layout = await this.layoutRepo.findOne({
      where: { id: theaterEvent.layoutId, isActive: true },
    });
    if (!layout) throw new NotFoundException('Layout no encontrado');

    layoutData = {
      id: layout.id,
      name: layout.name,
      canvasWidth: layout.canvasWidth,
      canvasHeight: layout.canvasHeight,
      backgroundUrl: layout.backgroundUrl,
    };

    if (theaterEvent.seatsSnapshot && theaterEvent.seatsSnapshot.length > 0) {
      // Frozen seats — layout edits don't affect this event
      activeSeats = theaterEvent.seatsSnapshot;
    } else {
      // Live layout (no snapshot or old event)
      const fullLayout = await this.layoutRepo.findOne({
        where: { id: theaterEvent.layoutId, isActive: true },
        relations: ['seats'],
      });
      activeSeats = (fullLayout?.seats || []).filter((s) => s.isActive);
    }

    const seatIds = activeSeats.map((s) => s.id).filter(Boolean);

    // Get confirmed reservations from DB
    const reservations = await this.reservationRepo.find({
      where: { theaterEventId: theaterEvent.id, isActive: true },
    });
    const reservedSeatIds = new Set(reservations.map((r) => r.seatId));

    // Get temporary holds from Redis
    const holds = await this.seatHoldService.getHoldsForEvent(
      theaterEvent.id,
      seatIds,
    );

    // Build seat status map
    const seatMap = activeSeats.map((seat) => {
      let status: 'available' | 'held' | 'held_by_you' | 'reserved' | 'disabled';

      if (seat.isActive === false) {
        status = 'disabled';
      } else if (reservedSeatIds.has(seat.id)) {
        status = 'reserved';
      } else if (holds.has(seat.id)) {
        status = holds.get(seat.id) === userId ? 'held_by_you' : 'held';
      } else {
        status = 'available';
      }

      return {
        id: seat.id,
        label: seat.label,
        sectionName: seat.sectionName,
        rowName: seat.rowName,
        seatNumber: seat.seatNumber,
        posX: seat.posX,
        posY: seat.posY,
        angle: seat.angle,
        color: seat.color,
        backgroundColor: seat.backgroundColor,
        seatType: seat.seatType,
        price: seat.price ?? null,
        status,
      };
    });

    return {
      layout: layoutData,
      theaterEvent: {
        id: theaterEvent.id,
        seatingMode: theaterEvent.seatingMode,
      },
      seats: seatMap,
    };
  }

  // ═════════════════════════��══════════════════
  //  PUBLIC — Seat Hold (Step 3)
  // ════════════════════════════════════════════

  /**
   * Hold seats for a user. Atomic — all or nothing.
   * Broadcasts update via WebSocket.
   */
  async holdSeats(
    eventId: string,
    seatIds: string[],
    userId: string,
  ) {
    const theaterEvent = await this.getTheaterEvent(eventId);

    if (theaterEvent.seatingMode !== SeatingMode.NUMBERED) {
      throw new BadRequestException('Este evento no tiene asientos numerados');
    }

    // Verify seats aren't already reserved in DB
    const existingReservations = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.theaterEventId = :teId', { teId: theaterEvent.id })
      .andWhere('r.seatId IN (:...seatIds)', { seatIds })
      .andWhere('r.isActive = true')
      .getCount();

    if (existingReservations > 0) {
      throw new ConflictException(
        'Uno o mas asientos ya estan reservados',
      );
    }

    // Attempt Redis hold
    const result = await this.seatHoldService.holdSeats(
      theaterEvent.id,
      seatIds,
      userId,
    );

    if (!result.success) {
      throw new ConflictException({
        message: 'Algunos asientos ya estan apartados por otro usuario',
        failedSeatIds: result.failedSeatIds,
      });
    }

    // Get TTL for countdown timer
    const ttl = await this.seatHoldService.getHoldTtl(
      theaterEvent.id,
      seatIds[0],
    );

    // Broadcast to all viewers
    this.seatsGateway.broadcastSeatUpdate(theaterEvent.id, {
      seatIds,
      status: 'held',
    });

    return {
      success: true,
      heldSeatIds: seatIds,
      expiresInSeconds: ttl,
    };
  }

  /**
   * Release held seats (user cancels selection).
   */
  async releaseSeats(
    eventId: string,
    seatIds: string[],
    userId: string,
  ) {
    const theaterEvent = await this.getTheaterEvent(eventId);

    await this.seatHoldService.releaseSeats(
      theaterEvent.id,
      seatIds,
      userId,
    );

    // Broadcast release
    this.seatsGateway.broadcastSeatUpdate(theaterEvent.id, {
      seatIds,
      status: 'released',
    });

    return { success: true, releasedSeatIds: seatIds };
  }

  // ══════════════════════════���═════════════════
  //  PAYMENT — Overbooking Prevention (Steps 4 & 5)
  // ════════════════════════════════════════════

  /**
   * Step 4 — Verify seats before processing payment.
   * Called by the payment flow. Separate method for reuse.
   */
  async verifySeatHoldsForPayment(
    eventId: string,
    seatIds: string[],
    userId: string,
  ): Promise<{ valid: boolean; expiredSeatIds: string[] }> {
    const theaterEvent = await this.getTheaterEvent(eventId);

    // Double check DB reservations
    const existingReservations = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.theaterEventId = :teId', { teId: theaterEvent.id })
      .andWhere('r.seatId IN (:...seatIds)', { seatIds })
      .andWhere('r.isActive = true')
      .getCount();

    if (existingReservations > 0) {
      return { valid: false, expiredSeatIds: seatIds };
    }

    // Verify Redis holds
    return this.seatHoldService.verifyHoldsForPurchase(
      theaterEvent.id,
      seatIds,
      userId,
    );
  }

  /**
   * Step 5 — Confirm seats after payment webhook.
   * Creates permanent DB reservations and clears Redis holds.
   * This is the FINAL check — the last line of defense against overbooking.
   */
  async confirmSeatsAfterPayment(
    eventId: string,
    seatIds: string[],
    userId: string,
    ticketId: string,
  ): Promise<SeatReservation[]> {
    const theaterEvent = await this.getTheaterEvent(eventId);

    // Final DB-level overbooking check
    const existingReservations = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.theaterEventId = :teId', { teId: theaterEvent.id })
      .andWhere('r.seatId IN (:...seatIds)', { seatIds })
      .andWhere('r.isActive = true')
      .getCount();

    if (existingReservations > 0) {
      throw new ConflictException(
        'Asientos ya reservados — no se puede completar la compra',
      );
    }

    // Create permanent reservations
    const reservations = seatIds.map((seatId) =>
      this.reservationRepo.create({
        theaterEventId: theaterEvent.id,
        seatId,
        ticketId,
        userId,
      }),
    );

    const saved = await this.reservationRepo.save(reservations);

    // Clean up Redis holds
    await this.seatHoldService.confirmSeats(theaterEvent.id, seatIds);

    // Broadcast confirmed status
    this.seatsGateway.broadcastSeatUpdate(theaterEvent.id, {
      seatIds,
      status: 'reserved',
      userId,
    });

    return saved;
  }

  /**
   * Buy numbered seats — auto-approved payment (no Stripe).
   * Flow: verify Redis holds → create Payment → create Ticket → confirm seats in DB.
   *
   * TODO: Replace the auto-approval with a Stripe PaymentIntent flow when the payment
   * processor is configured. The seat hold + verify steps remain the same; only the
   * Payment creation and status need to change to 'pending' until the webhook fires.
   */
  async buySeats(
    eventId: string,
    seatIds: string[],
    userId: string,
  ): Promise<{ payment: Payment; ticket: Ticket; reservations: SeatReservation[] }> {
    if (!seatIds || seatIds.length === 0) {
      throw new BadRequestException('Debes seleccionar al menos un asiento');
    }

    // Step 4: verify holds still belong to this user
    const verification = await this.verifySeatHoldsForPayment(eventId, seatIds, userId);
    if (!verification.valid) {
      throw new ConflictException({
        message: 'Algunos asientos ya no están disponibles o el tiempo expiró',
        expiredSeatIds: verification.expiredSeatIds,
      });
    }

    const theaterEvent = await this.getTheaterEvent(eventId);
    const event = await this.eventRepo.findOne({
      where: { id: theaterEvent.eventId },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    // Compute total from seat prices (snapshot takes priority)
    let totalAmount = 0;
    if (theaterEvent.seatsSnapshot && theaterEvent.seatsSnapshot.length > 0) {
      const snapshotMap = new Map<string, any>(
        theaterEvent.seatsSnapshot.map((s: any) => [s.id, s]),
      );
      for (const seatId of seatIds) {
        totalAmount += Number(snapshotMap.get(seatId)?.price ?? 0);
      }
    } else {
      const seats = await this.seatRepo.find({ where: { id: In(seatIds) } });
      for (const seat of seats) {
        totalAmount += Number(seat.price ?? 0);
      }
    }

    // TODO: Replace with Stripe payment intent + webhook flow when payment processor is configured.
    // Currently every seat purchase is auto-approved without charging a real card.
    const payment = this.paymentRepo.create({
      userId,
      amount: totalAmount,
      currency: DEFAULT_CURRENCY,
      status: 'succeeded',
      description: `${seatIds.length} asiento(s) — ${event.title}`,
      referenceType: 'theater_seat',
      referenceId: theaterEvent.id,
    });
    await this.paymentRepo.save(payment);

    // One ticket covers all selected seats; seatId left null for multi-seat purchases
    const ticket = this.ticketRepo.create({
      userId,
      eventId: theaterEvent.eventId,
      ticketTypeId: null,
      eventTitle: event.title,
      ticketTypeName: `${seatIds.length} Asiento${seatIds.length === 1 ? '' : 's'}`,
      price: totalAmount,
      quantity: seatIds.length,
      status: 'active',
      qrCode: `${QR_CODE_PREFIX}-${randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`,
    });
    await this.ticketRepo.save(ticket);

    // Step 5: write permanent DB reservations + clear Redis holds
    const reservations = await this.confirmSeatsAfterPayment(
      eventId,
      seatIds,
      userId,
      ticket.id,
    );

    return { payment, ticket, reservations };
  }
}
