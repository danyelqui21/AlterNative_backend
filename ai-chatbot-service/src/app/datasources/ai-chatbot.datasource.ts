export abstract class AiChatbotDatasource {
  abstract findAll(filters: any): Promise<any>;
  abstract findById(id: string): Promise<any>;
  abstract create(data: any): Promise<any>;
  abstract save(entity: any): Promise<any>;
}
