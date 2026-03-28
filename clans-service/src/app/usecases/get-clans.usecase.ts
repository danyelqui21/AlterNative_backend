import { Injectable } from '@nestjs/common';
import { ClansRepository } from '../repositories/clans.repository';

@Injectable()
export class GetClansUseCase {
  constructor(private readonly repository: ClansRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getClans(filters);
  }
}
