import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArtistsGatewayService } from '../services/artists-gateway.service';

@ApiTags('Artists / Artistas')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly service: ArtistsGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.service.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
