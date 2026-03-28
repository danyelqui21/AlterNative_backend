import { Injectable } from '@nestjs/common';
import { AuthRepository } from '../repositories/auth.repository';

@Injectable()
export class GetProfileUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(userId: string): Promise<any> {
    return this.repository.getProfile(userId);
  }
}
