export abstract class ClansDatasource {
  // Clans
  abstract findAllClans(filters: any): Promise<any>;
  abstract findClanById(id: string): Promise<any>;
  abstract createClan(data: any): Promise<any>;
  abstract saveClan(entity: any): Promise<any>;

  // Members
  abstract findMembersByUser(userId: string): Promise<any[]>;
  abstract findMember(clanId: string, userId: string): Promise<any>;
  abstract countMembers(clanId: string): Promise<number>;
  abstract createMember(data: any): Promise<any>;
  abstract removeMember(member: any): Promise<void>;

  // Messages
  abstract findMessages(clanId: string, skip: number, limit: number): Promise<any[]>;
  abstract createMessage(data: any): Promise<any>;
  abstract saveMessages(messages: any[]): Promise<any[]>;

  // Users
  abstract findUserById(id: string): Promise<any>;

  // Config
  abstract getConfig(key: string): Promise<any>;

  // Counts
  abstract countClansByCreator(creatorId: string): Promise<number>;
}
