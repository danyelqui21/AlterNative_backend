import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';

@Injectable()
export class GetDetailUseCase {
  constructor(private readonly repository: NotificationsRepository) {}

  async execute(id: string): Promise<any> {
    return this.repository.getOne(id);
  }
}
