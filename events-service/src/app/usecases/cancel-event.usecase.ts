import { Injectable } from '@nestjs/common';
import { EventsRepository } from '../repositories/events.repository';

@Injectable()
export class CancelEventUseCase {
  constructor(private readonly repository: EventsRepository) {}

  async execute(id: string, organizerId: string): Promise<any> {
    return this.repository.cancelEvent(id, organizerId);
  }
}
