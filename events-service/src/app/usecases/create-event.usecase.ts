import { Injectable } from '@nestjs/common';
import { EventsRepository } from '../repositories/events.repository';

@Injectable()
export class CreateEventUseCase {
  constructor(private readonly repository: EventsRepository) {}

  async execute(data: any, organizerId: string): Promise<any> {
    return this.repository.createEvent(data, organizerId);
  }
}
