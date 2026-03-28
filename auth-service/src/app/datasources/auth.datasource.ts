export abstract class AuthDatasource {
  abstract findByEmail(email: string): Promise<any>;
  abstract findById(id: string): Promise<any>;
  abstract create(data: any): Promise<any>;
  abstract update(id: string, data: any): Promise<any>;
  abstract count(): Promise<number>;
}
