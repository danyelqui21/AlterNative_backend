import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminToursGatewayService } from '../services/admin-tours-gateway.service';

@ApiTags('Admin / Tours')
@Controller('admin/tours')
export class AdminToursController {
  constructor(private readonly service: AdminToursGatewayService) {}

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
