import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TicketsGatewayService } from '../services/tickets-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsGatewayService) {}

  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  myTickets(@CurrentUser('sub') userId: string) {
    return this.ticketsService.findMyTickets(userId);
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  purchase(
    @CurrentUser('sub') userId: string,
    @Body() dto: { eventId: string; ticketTypeId: string; quantity?: number },
  ) {
    return this.ticketsService.purchase(userId, dto);
  }
}
