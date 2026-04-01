import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TheatersGatewayService } from '../services/theaters-gateway.service';

@ApiTags('Admin / Theaters')
@Controller('admin/theaters')
export class AdminTheatersController {
  constructor(private readonly service: TheatersGatewayService) {}

  // ── Theater CRUD ──

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

  // ── Seating Layouts ──

  @Get(':id/layouts/:layoutId')
  getLayout(
    @Param('id') theaterId: string,
    @Param('layoutId') layoutId: string,
  ) {
    return this.service.getLayoutWithSeats(theaterId, layoutId);
  }

  @Post(':id/layouts')
  createLayout(
    @Param('id') theaterId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createLayout(theaterId, body as any);
  }

  @Put(':id/layouts/:layoutId')
  updateLayout(
    @Param('id') theaterId: string,
    @Param('layoutId') layoutId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateLayout(theaterId, layoutId, body as any);
  }

  // ── Seats (bulk upsert from layout editor) ──

  @Put(':id/layouts/:layoutId/seats')
  bulkUpsertSeats(
    @Param('id') theaterId: string,
    @Param('layoutId') layoutId: string,
    @Body() body: { seats: any[] },
  ) {
    return this.service.bulkUpsertSeats(theaterId, layoutId, body.seats);
  }

  // ── Theater Events ──

  @Post('events')
  createTheaterEvent(@Body() body: Record<string, unknown>) {
    return this.service.createTheaterEvent(body as any);
  }

  @Get('events/:eventId')
  getTheaterEvent(@Param('eventId') eventId: string) {
    return this.service.getTheaterEvent(eventId);
  }
}
