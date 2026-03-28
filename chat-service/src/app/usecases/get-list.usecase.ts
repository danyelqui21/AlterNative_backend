import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../repositories/chat.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: ChatRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
