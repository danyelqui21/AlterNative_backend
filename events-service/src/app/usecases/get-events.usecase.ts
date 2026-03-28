import { Injectable } from '@nestjs/common';
import { EventsRepository } from '../repositories/events.repository';

@Injectable()
export class GetEventsUseCase {
  constructor(private readonly repository: EventsRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getEvents(filters);
  }
}
