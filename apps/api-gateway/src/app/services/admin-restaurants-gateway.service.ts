import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../../../../restaurants-service/src/app/entities/restaurant.entity';

@Injectable()
export class AdminRestaurantsGatewayService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly repo: Repository<Restaurant>,
  ) {}

  async findAll(filters: {
    cuisineType?: string;
    city?: string;
    subscriptionTier?: string;
    isActive?: string;
    hasPromos?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('r');

    if (filters.cuisineType) {
      qb.andWhere('r.cuisineType = :cuisineType', { cuisineType: filters.cuisineType });
    }
    if (filters.city) {
      qb.andWhere('r.city = :city', { city: filters.city });
    }
    if (filters.subscriptionTier) {
      qb.andWhere('r.subscriptionTier = :tier', { tier: filters.subscriptionTier });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('r.isActive = :isActive', { isActive: filters.isActive === 'true' });
    }
    if (filters.hasPromos !== undefined) {
      qb.andWhere('r.hasPromos = :hasPromos', { hasPromos: filters.hasPromos === 'true' });
    }
    if (filters.search) {
      qb.andWhere('r.name ILIKE :search', { search: `%${filters.search}%` });
    }

    const [data, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const restaurant = await this.repo.findOne({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurante no encontrado');
    return restaurant;
  }

  async create(data: Partial<Restaurant>) {
    if (!data.name) throw new BadRequestException('El nombre es requerido');
    if (!data.description) throw new BadRequestException('La descripción es requerida');
    if (!data.cuisineType) throw new BadRequestException('El tipo de cocina es requerido');
    if (!data.address) throw new BadRequestException('La dirección es requerida');
    if (!data.city) throw new BadRequestException('La ciudad es requerida');

    const restaurant = this.repo.create(data);
    return this.repo.save(restaurant);
  }

  async update(id: string, data: Partial<Restaurant>) {
    const restaurant = await this.findOne(id);
    Object.assign(restaurant, data);
    return this.repo.save(restaurant);
  }

  async enable(id: string) {
    const restaurant = await this.findOne(id);
    restaurant.isActive = true;
    return this.repo.save(restaurant);
  }

  async disable(id: string) {
    const restaurant = await this.findOne(id);
    restaurant.isActive = false;
    return this.repo.save(restaurant);
  }

  async getStats() {
    const total = await this.repo.count();
    const active = await this.repo.count({ where: { isActive: true } });

    const byCuisine = await this.repo
      .createQueryBuilder('r')
      .select('r.cuisineType', 'cuisineType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.cuisineType')
      .getRawMany();

    const byCity = await this.repo
      .createQueryBuilder('r')
      .select('r.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.city')
      .getRawMany();

    const byTier = await this.repo
      .createQueryBuilder('r')
      .select('r.subscriptionTier', 'subscriptionTier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.subscriptionTier')
      .getRawMany();

    return {
      total,
      active,
      byCuisine: Object.fromEntries(byCuisine.map((r) => [r.cuisineType, Number(r.count)])),
      byCity: Object.fromEntries(byCity.map((r) => [r.city, Number(r.count)])),
      byTier: Object.fromEntries(byTier.map((r) => [r.subscriptionTier, Number(r.count)])),
    };
  }
}
