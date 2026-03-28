import { Injectable } from '@nestjs/common';
import { ReviewsRepository } from '../repositories/reviews.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: ReviewsRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
