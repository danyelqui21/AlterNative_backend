import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../repositories/admin.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: AdminRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
