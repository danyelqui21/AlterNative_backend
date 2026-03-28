import { Injectable } from '@nestjs/common';
import { RestaurantsRepository } from '../repositories/restaurants.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: RestaurantsRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
