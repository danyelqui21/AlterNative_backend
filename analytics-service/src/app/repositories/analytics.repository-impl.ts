import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsDatasource } from '../datasources/analytics.datasource';

@Injectable()
export class AnalyticsRepositoryImpl extends AnalyticsRepository {
  constructor(private readonly datasource: AnalyticsDatasource) {
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
