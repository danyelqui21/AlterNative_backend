import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tour } from '../../../../../tours-service/src/app/entities/tour.entity';

@Injectable()
export class ToursGatewayService {
  constructor(
    @InjectRepository(Tour)
    private readonly repo: Repository<Tour>,
  ) {}

  async findAll(filters: { type?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('t');

    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }

    qb.orderBy('t.rating', 'DESC').skip(skip).take(limit);
    return qb.getMany();
  }

  async findOne(id: string) {
    const tour = await this.repo.findOne({ where: { id } });
    if (!tour) throw new NotFoundException('Tour no encontrado');
    return tour;
  }
}
