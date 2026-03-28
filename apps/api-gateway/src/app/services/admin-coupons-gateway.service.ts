import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';

@Injectable()
export class AdminCouponsGatewayService {
  constructor(
    @InjectRepository(Coupon)
    private readonly repo: Repository<Coupon>,
  ) {}

  async findAll(filters: {
    isActive?: string;
    discountType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('c');

    if (filters.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: filters.isActive === 'true' });
    }
    if (filters.discountType) {
      qb.andWhere('c.discountType = :discountType', { discountType: filters.discountType });
    }
    if (filters.search) {
      qb.andWhere('(c.code ILIKE :search OR c.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('c.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const coupon = await this.repo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Cupón no encontrado');
    return coupon;
  }

  async create(data: Partial<Coupon>) {
    if (!data.code) throw new BadRequestException('El código es requerido');
    if (!data.description) throw new BadRequestException('La descripción es requerida');
    if (data.discountAmount === undefined || data.discountAmount === null) {
      throw new BadRequestException('El monto de descuento es requerido');
    }

    const existing = await this.repo.findOne({ where: { code: data.code } });
    if (existing) throw new BadRequestException('Ya existe un cupón con ese código');

    if (data.discountType === 'percentage' && Number(data.discountAmount) > 100) {
      throw new BadRequestException('El porcentaje de descuento no puede ser mayor a 100');
    }

    const coupon = this.repo.create(data);
    return this.repo.save(coupon);
  }

  async update(id: string, data: Partial<Coupon>) {
    const coupon = await this.findOne(id);

    if (data.code && data.code !== coupon.code) {
      const existing = await this.repo.findOne({ where: { code: data.code } });
      if (existing) throw new BadRequestException('Ya existe un cupón con ese código');
    }

    if (data.discountType === 'percentage' && Number(data.discountAmount ?? coupon.discountAmount) > 100) {
      throw new BadRequestException('El porcentaje de descuento no puede ser mayor a 100');
    }

    Object.assign(coupon, data);
    return this.repo.save(coupon);
  }

  async enable(id: string) {
    const coupon = await this.findOne(id);
    coupon.isActive = true;
    return this.repo.save(coupon);
  }

  async disable(id: string) {
    const coupon = await this.findOne(id);
    coupon.isActive = false;
    return this.repo.save(coupon);
  }

  async getStats() {
    const total = await this.repo.count();
    const active = await this.repo.count({ where: { isActive: true } });
    const expired = await this.repo
      .createQueryBuilder('c')
      .where('c.expiresAt IS NOT NULL')
      .andWhere('c.expiresAt < :now', { now: new Date() })
      .getCount();

    const result = await this.repo
      .createQueryBuilder('c')
      .select('SUM(c.usedCount)', 'totalRedemptions')
      .getRawOne();

    return {
      total,
      active,
      expired,
      totalRedemptions: Number(result?.totalRedemptions) || 0,
    };
  }

  async validateCoupon(code: string) {
    const coupon = await this.repo.findOne({ where: { code } });

    if (!coupon) {
      throw new NotFoundException('Cupón no encontrado');
    }
    if (!coupon.isActive) {
      throw new BadRequestException('Este cupón está desactivado');
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new BadRequestException('Este cupón ha expirado');
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Este cupón ha alcanzado su límite de usos');
    }

    return coupon;
  }
}
