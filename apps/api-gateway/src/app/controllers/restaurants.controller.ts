import { Controller, Get, Param, Query } from '@nestjs/common';
import { RestaurantsGatewayService } from '../services/restaurants-gateway.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly service: RestaurantsGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.service.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
