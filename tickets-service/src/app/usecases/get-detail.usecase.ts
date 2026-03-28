import { Injectable } from '@nestjs/common';
import { TicketsRepository } from '../repositories/tickets.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: TicketsRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
