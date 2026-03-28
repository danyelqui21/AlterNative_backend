import { Injectable } from '@nestjs/common';
import { TicketsRepository } from '../repositories/tickets.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: TicketsRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
