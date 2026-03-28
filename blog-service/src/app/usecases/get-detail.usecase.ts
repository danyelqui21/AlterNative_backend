import { Injectable } from '@nestjs/common';
import { BlogRepository } from '../repositories/blog.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: BlogRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
