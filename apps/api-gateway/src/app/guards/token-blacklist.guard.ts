import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TokenBlacklistGuard implements CanActivate {
  constructor(private readonly blacklist: TokenBlacklistService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return true; // No token — let JwtAuthGuard handle it

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.decode(token);
      if (decoded?.tid) {
        const isBlacklisted = await this.blacklist.isBlacklisted(decoded.tid);
        if (isBlacklisted) {
          throw new UnauthorizedException('Sesion cerrada');
        }
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      // If decode fails, let JwtAuthGuard handle it
    }
    return true;
  }
}
