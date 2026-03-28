export abstract class AuthRepository {
  abstract register(data: any): Promise<any>;
  abstract login(data: any): Promise<any>;
  abstract getProfile(userId: string): Promise<any>;
  abstract updateProfile(userId: string, data: any): Promise<any>;
}
