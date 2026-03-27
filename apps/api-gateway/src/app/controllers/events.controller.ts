import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsGatewayService } from '../services/events-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.eventsService.findAll(filters as any);
  }

  @Get('featured')
  findFeatured() {
    return this.eventsService.findFeatured();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: Record<string, unknown>,
    @CurrentUser('sub') organizerId: string
  ) {
    return this.eventsService.create(dto, organizerId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
    @CurrentUser('sub') organizerId: string
  ) {
    return this.eventsService.update(id, dto, organizerId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(
    @Param('id') id: string,
    @CurrentUser('sub') organizerId: string
  ) {
    return this.eventsService.delete(id, organizerId);
  }
}
