import { Injectable } from '@nestjs/common';
import { EventsRepository } from '../repositories/events.repository';

@Injectable()
export class UpdateEventUseCase {
  constructor(private readonly repository: EventsRepository) {}

  async execute(id: string, data: any, organizerId: string): Promise<any> {
    return this.repository.updateEvent(id, data, organizerId);
  }
}
