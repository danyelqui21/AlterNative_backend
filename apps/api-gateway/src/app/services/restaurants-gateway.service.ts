import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../../../../restaurants-service/src/app/entities/restaurant.entity';

@Injectable()
export class RestaurantsGatewayService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly repo: Repository<Restaurant>,
  ) {}

  async findAll(filters: { cuisine?: string; city?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('r');

    if (filters.cuisine) {
      qb.andWhere('r.cuisineType = :cuisine', { cuisine: filters.cuisine });
    }
    if (filters.city) {
      qb.andWhere('r.city = :city', { city: filters.city });
    }

    qb.orderBy('r.rating', 'DESC').skip(skip).take(limit);
    return qb.getMany();
  }

  async findOne(id: string) {
    const restaurant = await this.repo.findOne({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurante no encontrado');
    return restaurant;
  }
}
