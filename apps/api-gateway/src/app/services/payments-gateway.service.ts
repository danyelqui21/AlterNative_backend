import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from './stripe.service';
import { EmailService } from './email.service';
import { StripeCustomer } from '../entities/stripe-customer.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Payment } from '../entities/payment.entity';
import { Ticket } from '../entities/ticket.entity';
import { Wallet, WalletTransaction } from '../entities/wallet.entity';
import { User } from '../../../../../auth-service/src/app/entities/user.entity';
import { Event } from '../../../../../events-service/src/app/entities/event.entity';
import { TicketType } from '../../../../../events-service/src/app/entities/ticket-type.entity';
import { MessagingService } from '@lagunapp-backend/messaging';
import { randomUUID } from 'crypto';
import { QR_CODE_PREFIX } from '../constants';

@Injectable()
export class PaymentsGatewayService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsGatewayService.name);

  constructor(
    @InjectRepository(StripeCustomer)
    private readonly stripeCustomerRepo: Repository<StripeCustomer>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
    private readonly stripeService: StripeService,
    private readonly messaging: MessagingService,
    private readonly emailService: EmailService,
  ) {}

  // ── RabbitMQ Consumers ──

  async onModuleInit() {
    // Process successful payments asynchronously
    await this.messaging.subscribe('payment.completed', async (event) => {
      const { paymentId, userId, referenceType, referenceId, amount } =
        event.payload as {
          paymentId: string;
          userId: string;
          referenceType?: string;
          referenceId?: string;
          amount: number;
        };

      this.logger.log(
        `Processing payment.completed: ${paymentId} (${referenceType})`,
      );

      // Create ticket if it's a ticket purchase
      if (referenceType === 'ticket' && referenceId) {
        try {
          const ticketType = await this.ticketTypeRepo.findOne({
            where: { id: referenceId },
          });
          const eventEntity = ticketType
            ? await this.eventRepo.findOne({
                where: { id: ticketType.eventId },
              })
            : null;

          const ticket = this.ticketRepo.create({
            userId,
            eventId: ticketType?.eventId ?? '',
            ticketTypeId: referenceId,
            eventTitle: eventEntity?.title ?? 'Evento',
            ticketTypeName: ticketType?.name ?? 'General',
            price: amount,
            quantity: 1,
            status: 'active',
            qrCode: `${QR_CODE_PREFIX}-${randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`,
          });
          await this.ticketRepo.save(ticket);
          this.logger.log(`Ticket created: ${ticket.id} for user ${userId}`);
        } catch (err: any) {
          this.logger.error(`Failed to create ticket: ${err.message}`);
        }
      }

      // Credit wallet if it's a top-up
      if (referenceType === 'topup') {
        try {
          let wallet = await this.walletRepo.findOne({
            where: { userId, isActive: true },
          });
          if (!wallet) {
            wallet = this.walletRepo.create({ userId, balance: 0 });
            wallet = await this.walletRepo.save(wallet);
          }

          wallet.balance = Number(wallet.balance) + Number(amount);
          await this.walletRepo.save(wallet);

          const tx = this.walletTxRepo.create({
            walletId: wallet.id,
            type: 'topup',
            amount: Number(amount),
            description: 'Recarga de saldo',
            referenceId: paymentId,
          });
          await this.walletTxRepo.save(tx);
          this.logger.log(`Wallet topped up: ${amount} for user ${userId}`);
        } catch (err: any) {
          this.logger.error(`Failed to credit wallet: ${err.message}`);
        }
      }

      // Send confirmation email
      try {
        const user = await this.userRepo.findOne({
          where: { id: userId, isActive: true },
        });
        if (user) {
          await this.emailService.sendPaymentConfirmationEmail(
            user.email,
            user.name,
            Number(amount),
            referenceType ?? 'payment',
          );
        }
      } catch (err: any) {
        this.logger.error(`Failed to send payment confirmation: ${err.message}`);
      }
    });

    // Handle failed payments
    await this.messaging.subscribe('payment.failed', async (event) => {
      const { paymentId, userId, referenceType } = event.payload as {
        paymentId: string;
        userId: string;
        referenceType?: string;
      };

      this.logger.warn(
        `Payment failed: ${paymentId} for user ${userId} (${referenceType})`,
      );

      // Notify user of failed payment via email
      try {
        const user = await this.userRepo.findOne({
          where: { id: userId, isActive: true },
        });
        if (user) {
          await this.emailService.sendPaymentFailedEmail(
            user.email,
            user.name,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Failed to send payment failure notification: ${err.message}`,
        );
      }
    });

    // Handle refunds
    await this.messaging.subscribe('payment.refunded', async (event) => {
      const { paymentId, userId, amount, referenceType } = event.payload as {
        paymentId: string;
        userId: string;
        amount: number;
        referenceType?: string;
      };

      this.logger.log(`Processing payment.refunded: ${paymentId}`);

      // If it was a wallet top-up, debit the wallet
      if (referenceType === 'topup') {
        try {
          const wallet = await this.walletRepo.findOne({
            where: { userId, isActive: true },
          });
          if (wallet) {
            wallet.balance = Math.max(0, Number(wallet.balance) - Number(amount));
            await this.walletRepo.save(wallet);

            const tx = this.walletTxRepo.create({
              walletId: wallet.id,
              type: 'refund',
              amount: Number(amount),
              description: 'Reembolso de recarga',
              referenceId: paymentId,
            });
            await this.walletTxRepo.save(tx);
          }
        } catch (err: any) {
          this.logger.error(`Failed to debit wallet on refund: ${err.message}`);
        }
      }

      // If it was a ticket, cancel the ticket
      if (referenceType === 'ticket') {
        try {
          const payment = await this.paymentRepo.findOne({
            where: { id: paymentId, isActive: true },
          });
          if (payment?.referenceId) {
            const ticket = await this.ticketRepo.findOne({
              where: { ticketTypeId: payment.referenceId, userId, isActive: true },
              order: { createdAt: 'DESC' },
            });
            if (ticket) {
              ticket.status = 'refunded';
              await this.ticketRepo.save(ticket);
            }
          }
        } catch (err: any) {
          this.logger.error(`Failed to cancel ticket on refund: ${err.message}`);
        }
      }
    });

    this.logger.log('Payment event consumers initialized');
  }

  // ── Helpers ──

  async getOrCreateCustomer(userId: string): Promise<string> {
    const existing = await this.stripeCustomerRepo.findOne({
      where: { userId, isActive: true },
    });
    if (existing) return existing.stripeCustomerId;

    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const stripeCustomerId = await this.stripeService.createCustomer(
      user.email,
      user.name,
    );
    if (!stripeCustomerId) {
      throw new BadRequestException(
        'Stripe no esta configurado. No se pueden procesar pagos',
      );
    }

    const record = this.stripeCustomerRepo.create({
      userId,
      stripeCustomerId,
    });
    await this.stripeCustomerRepo.save(record);

    return stripeCustomerId;
  }

  // ── Payment Intents ──

  async createPaymentIntent(
    userId: string,
    dto: {
      amount: number;
      currency?: string;
      description?: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('amount debe ser mayor a 0');
    }

    if (!this.stripeService.isConfigured) {
      throw new BadRequestException(
        'Stripe no esta configurado. No se pueden procesar pagos',
      );
    }

    const currency = dto.currency || 'mxn';
    const customerId = await this.getOrCreateCustomer(userId);

    const intent = await this.stripeService.createPaymentIntent(
      dto.amount,
      currency,
      customerId,
      dto.description,
    );

    const payment = this.paymentRepo.create({
      userId,
      stripePaymentIntentId: intent.id,
      amount: dto.amount,
      currency,
      status: 'pending',
      description: dto.description,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
    });
    const saved = await this.paymentRepo.save(payment);

    return { clientSecret: intent.client_secret, paymentId: saved.id };
  }

  // ── Webhook ──

  async handleWebhook(event: any) {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const payment = await this.paymentRepo.findOne({
          where: { stripePaymentIntentId: pi.id, isActive: true },
        });
        if (payment) {
          payment.status = 'succeeded';
          await this.paymentRepo.save(payment);
          this.messaging
            .publish('payment.completed', {
              paymentId: payment.id,
              userId: payment.userId,
              amount: payment.amount,
              currency: payment.currency,
              referenceType: payment.referenceType,
              referenceId: payment.referenceId,
            })
            .catch(() => {});
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const payment = await this.paymentRepo.findOne({
          where: { stripePaymentIntentId: pi.id, isActive: true },
        });
        if (payment) {
          payment.status = 'failed';
          await this.paymentRepo.save(payment);
          this.messaging
            .publish('payment.failed', {
              paymentId: payment.id,
              userId: payment.userId,
              amount: payment.amount,
              referenceType: payment.referenceType,
              referenceId: payment.referenceId,
            })
            .catch(() => {});
        }
        break;
      }
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  // ── Payment Methods ──

  async getPaymentMethods(userId: string) {
    const customer = await this.stripeCustomerRepo.findOne({
      where: { userId, isActive: true },
    });
    if (!customer) return [];

    const stripeMethods = await this.stripeService.listPaymentMethods(
      customer.stripeCustomerId,
    );

    // Merge with our saved metadata (isDefault)
    const savedMethods = await this.paymentMethodRepo.find({
      where: { userId, isActive: true },
    });
    const defaultMap = new Map(
      savedMethods.map((m) => [m.stripePaymentMethodId, m]),
    );

    return stripeMethods.map((sm: any) => {
      const saved = defaultMap.get(sm.id);
      return {
        id: saved?.id,
        stripePaymentMethodId: sm.id,
        brand: sm.card?.brand,
        last4: sm.card?.last4,
        expMonth: sm.card?.exp_month,
        expYear: sm.card?.exp_year,
        isDefault: saved?.isDefault || false,
      };
    });
  }

  async addPaymentMethod(userId: string, stripePaymentMethodId: string) {
    if (!stripePaymentMethodId) {
      throw new BadRequestException('stripePaymentMethodId es requerido');
    }

    const customerId = await this.getOrCreateCustomer(userId);

    const attached = await this.stripeService.attachPaymentMethod(
      stripePaymentMethodId,
      customerId,
    );
    if (!attached) {
      throw new BadRequestException('No se pudo agregar el metodo de pago');
    }

    // Check if this is the first card
    const existingCount = await this.paymentMethodRepo.count({
      where: { userId, isActive: true },
    });

    const method = this.paymentMethodRepo.create({
      userId,
      stripePaymentMethodId,
      brand: attached.card?.brand,
      last4: attached.card?.last4,
      expMonth: attached.card?.exp_month,
      expYear: attached.card?.exp_year,
      isDefault: existingCount === 0, // First card is default
    });

    return this.paymentMethodRepo.save(method);
  }

  async removePaymentMethod(userId: string, paymentMethodId: string) {
    const method = await this.paymentMethodRepo.findOne({
      where: { id: paymentMethodId, userId, isActive: true },
    });
    if (!method) {
      throw new NotFoundException('Metodo de pago no encontrado');
    }

    await this.stripeService.detachPaymentMethod(method.stripePaymentMethodId);

    method.isActive = false;
    await this.paymentMethodRepo.save(method);

    return { message: 'Metodo de pago eliminado' };
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    const method = await this.paymentMethodRepo.findOne({
      where: { id: paymentMethodId, userId, isActive: true },
    });
    if (!method) {
      throw new NotFoundException('Metodo de pago no encontrado');
    }

    // Unset all defaults for this user
    await this.paymentMethodRepo.update(
      { userId, isActive: true },
      { isDefault: false },
    );

    // Set this one as default
    method.isDefault = true;
    await this.paymentMethodRepo.save(method);

    return { message: 'Metodo de pago predeterminado actualizado' };
  }

  // ── Payment History ──

  async getPaymentHistory(
    userId: string,
    filters: { page?: number; limit?: number },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.paymentRepo.findAndCount({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, meta: { total, page, limit } };
  }

  // ── Refunds ──

  async refundPayment(userId: string, paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, userId, isActive: true },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status !== 'succeeded') {
      throw new BadRequestException(
        'Solo se pueden reembolsar pagos exitosos',
      );
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException(
        'Este pago no tiene un PaymentIntent asociado',
      );
    }

    await this.stripeService.refundPayment(payment.stripePaymentIntentId);

    payment.status = 'refunded';
    await this.paymentRepo.save(payment);

    this.messaging
      .publish('payment.refunded', {
        paymentId: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        referenceType: payment.referenceType,
        referenceId: payment.referenceId,
      })
      .catch(() => {});

    return { message: 'Pago reembolsado', payment };
  }

  // ── Admin ──

  async adminFindAll(filters: {
    status?: string;
    userId?: string;
    referenceType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .where('payment.isActive = :isActive', { isActive: true });

    if (filters.status) {
      qb.andWhere('payment.status = :status', { status: filters.status });
    }
    if (filters.userId) {
      qb.andWhere('payment.userId = :userId', { userId: filters.userId });
    }
    if (filters.referenceType) {
      qb.andWhere('payment.referenceType = :referenceType', {
        referenceType: filters.referenceType,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('payment.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('payment.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    qb.orderBy('payment.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async adminStats() {
    const total = await this.paymentRepo.count({
      where: { isActive: true },
    });

    const byStatus = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('payment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.isActive = :isActive', { isActive: true })
      .groupBy('payment.status')
      .getRawMany();

    const { totalRevenue } = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'totalRevenue')
      .where('payment.isActive = :isActive AND payment.status = :status', {
        isActive: true,
        status: 'succeeded',
      })
      .getRawOne();

    const byType = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('payment.referenceType', 'referenceType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'total')
      .where(
        'payment.isActive = :isActive AND payment.status = :status',
        { isActive: true, status: 'succeeded' },
      )
      .groupBy('payment.referenceType')
      .getRawMany();

    return {
      totalPayments: total,
      totalRevenue: Number(totalRevenue),
      byStatus,
      byType,
    };
  }

  async adminRefund(paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, isActive: true },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status !== 'succeeded') {
      throw new BadRequestException(
        'Solo se pueden reembolsar pagos exitosos',
      );
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException(
        'Este pago no tiene un PaymentIntent asociado',
      );
    }

    await this.stripeService.refundPayment(payment.stripePaymentIntentId);

    payment.status = 'refunded';
    await this.paymentRepo.save(payment);

    this.messaging
      .publish('payment.refunded', {
        paymentId: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        referenceType: payment.referenceType,
        referenceId: payment.referenceId,
      })
      .catch(() => {});

    return { message: 'Pago reembolsado', payment };
  }
}
