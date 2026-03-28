import { Injectable } from '@nestjs/common';
import { ClansRepository } from '../repositories/clans.repository';

@Injectable()
export class ShareEventUseCase {
  constructor(private readonly repository: ClansRepository) {}

  async execute(userId: string, data: any): Promise<any> {
    return this.repository.shareEvent(userId, data);
  }
}
