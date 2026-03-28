import { Injectable } from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { EventsDatasource } from '../datasources/events.datasource';

@Injectable()
export class EventsRepositoryImpl extends EventsRepository {
  constructor(private readonly datasource: EventsDatasource) {
    super();
  }

  async getEvents(filters: any): Promise<any> {
    return this.datasource.findAll(filters);
  }

  async getEvent(id: string): Promise<any> {
    return this.datasource.findById(id);
  }

  async getFeatured(): Promise<any[]> {
    return this.datasource.findFeatured();
  }

  async createEvent(data: any, organizerId: string): Promise<any> {
    return this.datasource.create({ ...data, organizerId });
  }

  async updateEvent(id: string, data: any, organizerId: string): Promise<any> {
    const event = await this.datasource.findById(id);
    Object.assign(event, data);
    return this.datasource.save(event);
  }

  async cancelEvent(id: string, organizerId: string): Promise<any> {
    const event = await this.datasource.findById(id);
    return this.datasource.save(event);
  }
}
