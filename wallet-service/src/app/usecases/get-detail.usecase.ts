import { Injectable } from '@nestjs/common';
import { WalletRepository } from '../repositories/wallet.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: WalletRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
