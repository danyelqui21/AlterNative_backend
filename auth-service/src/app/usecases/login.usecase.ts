import { Injectable } from '@nestjs/common';
import { AuthRepository } from '../repositories/auth.repository';

@Injectable()
export class LoginUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(data: any): Promise<any> {
    return this.repository.login(data);
  }
}
