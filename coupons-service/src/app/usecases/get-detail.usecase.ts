import { Injectable } from '@nestjs/common';
import { CouponsRepository } from '../repositories/coupons.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: CouponsRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
