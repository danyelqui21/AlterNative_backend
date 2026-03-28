import { Injectable } from '@nestjs/common';
import { AiChatbotRepository } from '../repositories/ai-chatbot.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: AiChatbotRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
