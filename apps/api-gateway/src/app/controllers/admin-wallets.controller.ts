import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletsGatewayService } from '../services/wallets-gateway.service';
import { JwtAuthGuard } from '@lagunapp-backend/auth';

@ApiTags('Admin: Wallets')
@Controller('admin/wallets')
@UseGuards(JwtAuthGuard)
export class AdminWalletsController {
  constructor(private readonly walletsService: WalletsGatewayService) {}

  @Get('stats')
  stats() {
    return this.walletsService.stats();
  }

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.walletsService.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.walletsService.findOne(id);
  }

  @Put(':id/adjust')
  adjust(
    @Param('id') id: string,
    @Body() dto: { amount: number; type: string; description?: string },
  ) {
    return this.walletsService.adjust(id, dto);
  }

  @Put(':id/freeze')
  freeze(@Param('id') id: string) {
    return this.walletsService.freeze(id);
  }

  @Put(':id/unfreeze')
  unfreeze(@Param('id') id: string) {
    return this.walletsService.unfreeze(id);
  }
}
