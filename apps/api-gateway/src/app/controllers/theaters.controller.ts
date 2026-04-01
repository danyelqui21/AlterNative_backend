import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TheatersGatewayService } from '../services/theaters-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Theaters / Teatros')
@Controller('theaters')
export class TheatersController {
  constructor(private readonly service: TheatersGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.service.findAll(filters as any);
  }

  // Specific routes BEFORE :id wildcard
  @Get('event-info/:eventId')
  getTheaterInfoForEvent(@Param('eventId') eventId: string) {
    return this.service.getTheaterInfoForEvent(eventId);
  }

  @Get(':theaterId/events')
  getTheaterEvents(@Param('theaterId') theaterId: string) {
    return this.service.getEventsForTheater(theaterId);
  }

  @Get('events/:eventId/seats')
  getSeatMap(
    @Param('eventId') eventId: string,
  ) {
    // Public — anyone can VIEW the seat map
    // Auth is only required for HOLDING seats
    return this.service.getSeatMap(eventId, undefined);
  }

  @Post('events/:eventId/hold-seats')
  @UseGuards(JwtAuthGuard)
  holdSeats(
    @Param('eventId') eventId: string,
    @Body() body: { seatIds: string[] },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.holdSeats(eventId, body.seatIds, userId);
  }

  @Post('events/:eventId/release-seats')
  @UseGuards(JwtAuthGuard)
  releaseSeats(
    @Param('eventId') eventId: string,
    @Body() body: { seatIds: string[] },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.releaseSeats(eventId, body.seatIds, userId);
  }

  @Post('events/:eventId/verify-seats')
  @UseGuards(JwtAuthGuard)
  verifySeatsForPayment(
    @Param('eventId') eventId: string,
    @Body() body: { seatIds: string[] },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.verifySeatHoldsForPayment(
      eventId,
      body.seatIds,
      userId,
    );
  }

  // Wildcard :id route LAST
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
