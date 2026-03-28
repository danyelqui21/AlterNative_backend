import { Injectable } from '@nestjs/common';
import { RestaurantsRepository } from '../repositories/restaurants.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: RestaurantsRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
