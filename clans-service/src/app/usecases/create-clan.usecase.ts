import { Injectable } from '@nestjs/common';
import { ClansRepository } from '../repositories/clans.repository';

@Injectable()
export class CreateClanUseCase {
  constructor(private readonly repository: ClansRepository) {}

  async execute(data: any, userId: string): Promise<any> {
    return this.repository.createClan(data, userId);
  }
}
