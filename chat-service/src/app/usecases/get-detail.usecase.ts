import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../repositories/chat.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: ChatRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
