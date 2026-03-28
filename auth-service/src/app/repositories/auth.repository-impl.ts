import { Injectable } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuthDatasource } from '../datasources/auth.datasource';

@Injectable()
export class AuthRepositoryImpl extends AuthRepository {
  constructor(private readonly datasource: AuthDatasource) {
    super();
  }

  async register(data: any): Promise<any> {
    return this.datasource.create(data);
  }

  async login(data: any): Promise<any> {
    return this.datasource.findByEmail(data.email);
  }

  async getProfile(userId: string): Promise<any> {
    return this.datasource.findById(userId);
  }

  async updateProfile(userId: string, data: any): Promise<any> {
    return this.datasource.update(userId, data);
  }
}
