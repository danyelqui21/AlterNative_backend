import { Injectable } from '@nestjs/common';
import { ReviewsRepository } from '../repositories/reviews.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: ReviewsRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
