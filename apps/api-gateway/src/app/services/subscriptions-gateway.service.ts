import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';

const VALID_PLANS = ['free', 'basic', 'premium', 'promax'];
const VALID_STATUSES = ['active', 'cancelled', 'expired', 'suspended'];

@Injectable()
export class SubscriptionsGatewayService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
  ) {}

  async findAll(filters: {
    plan?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.subRepo
      .createQueryBuilder('sub')
      .where('sub.isActive = :isActive', { isActive: true });

    if (filters.plan) {
      qb.andWhere('sub.plan = :plan', { plan: filters.plan });
    }
    if (filters.status) {
      qb.andWhere('sub.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere('sub.restaurantName ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('sub.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const sub = await this.subRepo.findOne({
      where: { id, isActive: true },
    });
    if (!sub) {
      throw new NotFoundException('Subscripcion no encontrada');
    }
    return sub;
  }

  async create(dto: Record<string, unknown>) {
    const plan = dto.plan as string;
    if (!plan || !VALID_PLANS.includes(plan)) {
      throw new BadRequestException(
        `Plan invalido. Opciones: ${VALID_PLANS.join(', ')}`,
      );
    }
    if (!dto.restaurantId) {
      throw new BadRequestException('restaurantId es requerido');
    }
    if (!dto.restaurantName) {
      throw new BadRequestException('restaurantName es requerido');
    }

    const sub = this.subRepo.create({
      ...dto,
      status: 'active',
      startDate: dto.startDate || new Date(),
    } as Partial<Subscription>);

    return this.subRepo.save(sub);
  }

  async update(id: string, dto: Record<string, unknown>) {
    const sub = await this.findOne(id);
    if (dto.plan && !VALID_PLANS.includes(dto.plan as string)) {
      throw new BadRequestException(
        `Plan invalido. Opciones: ${VALID_PLANS.join(', ')}`,
      );
    }
    Object.assign(sub, dto);
    return this.subRepo.save(sub);
  }

  async cancel(id: string) {
    const sub = await this.findOne(id);
    sub.status = 'cancelled';
    sub.endDate = new Date();
    return this.subRepo.save(sub);
  }

  async suspend(id: string) {
    const sub = await this.findOne(id);
    sub.status = 'suspended';
    return this.subRepo.save(sub);
  }

  async activate(id: string) {
    const sub = await this.findOne(id);
    sub.status = 'active';
    sub.endDate = null;
    return this.subRepo.save(sub);
  }

  async stats() {
    const total = await this.subRepo.count({ where: { isActive: true } });
    const active = await this.subRepo.count({
      where: { status: 'active', isActive: true },
    });

    const byPlanRaw = await this.subRepo
      .createQueryBuilder('sub')
      .select('sub.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .where('sub.isActive = :isActive', { isActive: true })
      .groupBy('sub.plan')
      .getRawMany();

    const byPlan: Record<string, number> = {};
    for (const row of byPlanRaw) {
      byPlan[row.plan] = Number(row.count);
    }

    const { totalMonthlyRevenue } = await this.subRepo
      .createQueryBuilder('sub')
      .select('COALESCE(SUM(sub.monthlyPrice), 0)', 'totalMonthlyRevenue')
      .where('sub.isActive = :isActive AND sub.status = :status', {
        isActive: true,
        status: 'active',
      })
      .getRawOne();

    return {
      total,
      active,
      byPlan,
      totalMonthlyRevenue: Number(totalMonthlyRevenue),
    };
  }
}
