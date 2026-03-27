import { Controller, Get, Param, Query } from '@nestjs/common';
import { ToursGatewayService } from '../services/tours-gateway.service';

@Controller('tours')
export class ToursController {
  constructor(private readonly service: ToursGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.service.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
