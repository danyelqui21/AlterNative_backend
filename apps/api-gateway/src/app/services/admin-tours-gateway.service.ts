import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tour } from '../../../../../tours-service/src/app/entities/tour.entity';

@Injectable()
export class AdminToursGatewayService {
  constructor(
    @InjectRepository(Tour)
    private readonly repo: Repository<Tour>,
  ) {}

  async findAll(filters: {
    type?: string;
    isFirstParty?: string;
    isActive?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('t');

    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }
    if (filters.isFirstParty !== undefined) {
      qb.andWhere('t.isFirstParty = :isFirstParty', { isFirstParty: filters.isFirstParty === 'true' });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('t.isActive = :isActive', { isActive: filters.isActive === 'true' });
    }
    if (filters.search) {
      qb.andWhere('t.title ILIKE :search', { search: `%${filters.search}%` });
    }

    const [data, total] = await qb
      .orderBy('t.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const tour = await this.repo.findOne({ where: { id } });
    if (!tour) throw new NotFoundException('Tour no encontrado');
    return tour;
  }

  async create(data: Partial<Tour>) {
    if (!data.title) throw new BadRequestException('El título es requerido');
    if (!data.description) throw new BadRequestException('La descripción es requerida');
    if (!data.type) throw new BadRequestException('El tipo es requerido');
    if (!data.duration) throw new BadRequestException('La duración es requerida');
    if (data.price === undefined || data.price === null) throw new BadRequestException('El precio es requerido');

    const tour = this.repo.create(data);
    return this.repo.save(tour);
  }

  async update(id: string, data: Partial<Tour>) {
    const tour = await this.findOne(id);
    Object.assign(tour, data);
    return this.repo.save(tour);
  }

  async enable(id: string) {
    const tour = await this.findOne(id);
    tour.isActive = true;
    return this.repo.save(tour);
  }

  async disable(id: string) {
    const tour = await this.findOne(id);
    tour.isActive = false;
    return this.repo.save(tour);
  }
}
