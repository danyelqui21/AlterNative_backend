import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdsGatewayService } from '../services/ads-gateway.service';
import { JwtAuthGuard } from '@lagunapp-backend/auth';

@ApiTags('Admin: Advertising')
@Controller('admin/ads')
@UseGuards(JwtAuthGuard)
export class AdminAdsController {
  constructor(private readonly adsService: AdsGatewayService) {}

  @Get('stats')
  stats() {
    return this.adsService.stats();
  }

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.adsService.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.adsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.adsService.update(id, dto);
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    return this.adsService.activate(id);
  }

  @Put(':id/pause')
  pause(@Param('id') id: string) {
    return this.adsService.pause(id);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.adsService.cancel(id);
  }
}
