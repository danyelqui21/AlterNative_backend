import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminCouponsGatewayService } from '../services/admin-coupons-gateway.service';

@ApiTags('Admin / Coupons')
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly service: AdminCouponsGatewayService) {}

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.service.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.service.create(body as any);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.update(id, body as any);
  }

  @Put(':id/enable')
  enable(@Param('id') id: string) {
    return this.service.enable(id);
  }

  @Put(':id/disable')
  disable(@Param('id') id: string) {
    return this.service.disable(id);
  }
}
