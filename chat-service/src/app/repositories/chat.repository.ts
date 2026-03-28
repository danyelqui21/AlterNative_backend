export abstract class ChatRepository {
  abstract getAll(filters: any): Promise<any>;
  abstract getOne(id: string): Promise<any>;
  abstract create(data: any): Promise<any>;
  abstract update(id: string, data: any): Promise<any>;
}
