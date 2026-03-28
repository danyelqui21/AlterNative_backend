import { Injectable } from '@nestjs/common';
import { ClansRepository } from '../repositories/clans.repository';

@Injectable()
export class LeaveClanUseCase {
  constructor(private readonly repository: ClansRepository) {}

  async execute(clanId: string, userId: string): Promise<any> {
    return this.repository.leaveClan(clanId, userId);
  }
}
