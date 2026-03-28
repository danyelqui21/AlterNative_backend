import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';

@Injectable()
export class GetListUseCase {
  constructor(private readonly repository: NotificationsRepository) {}

  async execute(filters?: any): Promise<any> {
    return this.repository.getAll(filters);
  }
}
