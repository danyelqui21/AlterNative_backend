import { Injectable } from '@nestjs/common';
import { ToursRepository } from '../repositories/tours.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: ToursRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
