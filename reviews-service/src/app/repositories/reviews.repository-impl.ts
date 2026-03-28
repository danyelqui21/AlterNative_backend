import { Injectable } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsDatasource } from '../datasources/reviews.datasource';

@Injectable()
export class ReviewsRepositoryImpl extends ReviewsRepository {
  constructor(private readonly datasource: ReviewsDatasource) {
    super();
  }

  async getAll(filters: any): Promise<any> {
    return this.datasource.findAll(filters);
  }

  async getOne(id: string): Promise<any> {
    return this.datasource.findById(id);
  }

  async create(data: any): Promise<any> {
    return this.datasource.create(data);
  }

  async update(id: string, data: any): Promise<any> {
    const entity = await this.datasource.findById(id);
    Object.assign(entity, data);
    return this.datasource.save(entity);
  }
}
