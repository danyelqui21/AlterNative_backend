import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsDatasource } from '../datasources/notifications.datasource';

@Injectable()
export class NotificationsRepositoryImpl extends NotificationsRepository {
  constructor(private readonly datasource: NotificationsDatasource) {
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
