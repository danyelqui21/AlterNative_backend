import { Injectable } from '@nestjs/common';
import { ClansRepository } from '../repositories/clans.repository';

@Injectable()
export class CanCreateUseCase {
  constructor(private readonly repository: ClansRepository) {}

  async execute(userId: string): Promise<any> {
    return this.repository.canCreate(userId);
  }
}
