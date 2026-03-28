import { Injectable } from '@nestjs/common';
import { AuthRepository } from '../repositories/auth.repository';

@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(userId: string, data: any): Promise<any> {
    return this.repository.updateProfile(userId, data);
  }
}
