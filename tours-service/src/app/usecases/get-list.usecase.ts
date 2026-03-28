import { Injectable } from '@nestjs/common';
import { ToursRepository } from '../repositories/tours.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: ToursRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
