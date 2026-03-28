import { Injectable } from '@nestjs/common';
import { AiChatbotRepository } from '../repositories/ai-chatbot.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: AiChatbotRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
