import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenBlacklistService implements OnModuleInit {
  private redis: any = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      const Redis = require('ioredis');
      const host = this.config.get('REDIS_HOST', 'localhost');
      const port = this.config.get('REDIS_PORT', 63790);
      const password = this.config.get('REDIS_PASSWORD', '');
      this.redis = new Redis({ host, port, password, lazyConnect: true });
      await this.redis.connect();
    } catch (_) {
      // Redis not available — blacklist disabled
      
    }
  }

  async blacklist(tokenId: string, ttlSeconds = 7 * 24 * 3600): Promise<void> {
    if (!this.redis) return;
    await this.redis.setex(`bl:${tokenId}`, ttlSeconds, '1');
  }

  async isBlacklisted(tokenId: string): Promise<boolean> {
    if (!this.redis) return false;
    const result = await this.redis.get(`bl:${tokenId}`);
    return result === '1';
  }
}
