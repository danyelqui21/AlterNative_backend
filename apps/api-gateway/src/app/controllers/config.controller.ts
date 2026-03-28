import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigGatewayService } from '../services/config-gateway.service';
import { JwtAuthGuard } from '@lagunapp-backend/auth';

@ApiTags('Config / Configuración')
@Controller('config')
export class ConfigController {
  constructor(private readonly service: ConfigGatewayService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get('modules')
  getModules() {
    return this.service.getModules();
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard)
  update(@Param('key') key: string, @Body('value') value: string) {
    return this.service.update(key, value);
  }
}
