import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformConfig } from '../entities/platform-config.entity';

@Injectable()
export class ConfigGatewayService {
  constructor(
    @InjectRepository(PlatformConfig)
    private readonly repo: Repository<PlatformConfig>,
  ) {}

  async getAll() {
    const configs = await this.repo.find();
    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }
    return result;
  }

  async getModules() {
    const configs = await this.repo.find();
    const modules: Record<string, boolean> = {};
    for (const c of configs) {
      if (c.key.startsWith('module.')) {
        modules[c.key.replace('module.', '')] = c.value === 'true';
      }
    }
    return modules;
  }

  async update(key: string, value: string) {
    let config = await this.repo.findOne({ where: { key } });
    if (config) {
      config.value = value;
    } else {
      config = this.repo.create({ key, value });
    }
    return this.repo.save(config);
  }
}
