import { Injectable } from '@nestjs/common';
import { AiChatbotRepository } from './ai-chatbot.repository';
import { AiChatbotDatasource } from '../datasources/ai-chatbot.datasource';

@Injectable()
export class AiChatbotRepositoryImpl extends AiChatbotRepository {
  constructor(private readonly datasource: AiChatbotDatasource) {
    super();
  }

  async getAll(filters: any): Promise<any> {
    return this.datasource.findAll(filters);
  }

  async getOne(id: string): Promise<any> {
    return this.datasource.findById(id);
  }

  async create(data: any): Promise<any> {
    return this.datasource.create(data);
  }

  async update(id: string, data: any): Promise<any> {
    const entity = await this.datasource.findById(id);
    Object.assign(entity, data);
    return this.datasource.save(entity);
  }
}
