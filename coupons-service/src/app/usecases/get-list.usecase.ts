import { Injectable } from '@nestjs/common';
import { CouponsRepository } from '../repositories/coupons.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: CouponsRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
