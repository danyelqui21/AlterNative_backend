import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../repositories/admin.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: AdminRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
