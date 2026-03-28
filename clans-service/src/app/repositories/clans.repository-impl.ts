import { Injectable } from '@nestjs/common';
import { ClansRepository } from './clans.repository';
import { ClansDatasource } from '../datasources/clans.datasource';

@Injectable()
export class ClansRepositoryImpl extends ClansRepository {
  constructor(private readonly datasource: ClansDatasource) {
    super();
  }

  async getClans(filters: any): Promise<any> {
    return this.datasource.findAllClans(filters);
  }

  async getClan(id: string): Promise<any> {
    return this.datasource.findClanById(id);
  }

  async getMyClans(userId: string): Promise<any[]> {
    return this.datasource.findMembersByUser(userId);
  }

  async createClan(data: any, userId: string): Promise<any> {
    return this.datasource.createClan({ ...data, creatorId: userId });
  }

  async updateClan(id: string, data: any, userId: string): Promise<any> {
    const clan = await this.datasource.findClanById(id);
    Object.assign(clan, data);
    return this.datasource.saveClan(clan);
  }

  async deleteClan(id: string, userId: string): Promise<any> {
    const clan = await this.datasource.findClanById(id);
    return this.datasource.saveClan(clan);
  }

  async joinClan(clanId: string, userId: string): Promise<any> {
    return this.datasource.createMember({ clanId, userId });
  }

  async leaveClan(clanId: string, userId: string): Promise<any> {
    const member = await this.datasource.findMember(clanId, userId);
    await this.datasource.removeMember(member);
    return { message: 'Has salido del clan' };
  }

  async getMessages(clanId: string, userId: string, page: number, limit: number): Promise<any> {
    const skip = (page - 1) * limit;
    return this.datasource.findMessages(clanId, skip, limit);
  }

  async sendMessage(clanId: string, userId: string, data: any): Promise<any> {
    return this.datasource.createMessage({ clanId, senderId: userId, ...data });
  }

  async shareEvent(userId: string, data: any): Promise<any> {
    return this.datasource.saveMessages(data.clanIds?.map((clanId: string) => ({
      clanId,
      senderId: userId,
      eventId: data.eventId,
    })) || []);
  }

  async canCreate(userId: string): Promise<any> {
    const user = await this.datasource.findUserById(userId);
    const count = await this.datasource.countClansByCreator(userId);
    const config = await this.datasource.getConfig('maxClansPerUser');
    return { canCreate: !!user, clansCreated: count, maxClans: parseInt(config?.value || '2', 10) };
  }
}
