export abstract class ClansRepository {
  abstract getClans(filters: any): Promise<any>;
  abstract getClan(id: string): Promise<any>;
  abstract getMyClans(userId: string): Promise<any[]>;
  abstract createClan(data: any, userId: string): Promise<any>;
  abstract updateClan(id: string, data: any, userId: string): Promise<any>;
  abstract deleteClan(id: string, userId: string): Promise<any>;
  abstract joinClan(clanId: string, userId: string): Promise<any>;
  abstract leaveClan(clanId: string, userId: string): Promise<any>;
  abstract getMessages(clanId: string, userId: string, page: number, limit: number): Promise<any>;
  abstract sendMessage(clanId: string, userId: string, data: any): Promise<any>;
  abstract shareEvent(userId: string, data: any): Promise<any>;
  abstract canCreate(userId: string): Promise<any>;
}
