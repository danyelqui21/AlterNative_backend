import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../repositories/analytics.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: AnalyticsRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
