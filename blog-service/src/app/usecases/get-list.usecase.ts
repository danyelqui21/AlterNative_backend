import { Injectable } from '@nestjs/common';
import { BlogRepository } from '../repositories/blog.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: BlogRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
