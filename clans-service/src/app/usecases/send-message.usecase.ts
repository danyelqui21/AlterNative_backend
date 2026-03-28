import { Injectable } from '@nestjs/common';
import { ClansRepository } from '../repositories/clans.repository';

@Injectable()
export class SendMessageUseCase {
  constructor(private readonly repository: ClansRepository) {}

  async execute(clanId: string, userId: string, data: any): Promise<any> {
    return this.repository.sendMessage(clanId, userId, data);
  }
}
