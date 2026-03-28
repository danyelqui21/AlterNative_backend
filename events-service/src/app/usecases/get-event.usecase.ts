import { Injectable } from '@nestjs/common';
import { EventsRepository } from '../repositories/events.repository';

@Injectable()
export class GetEventUseCase {
  constructor(private readonly repository: EventsRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getEvent(id);
  }
}
