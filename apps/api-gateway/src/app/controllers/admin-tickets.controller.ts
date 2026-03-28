import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TicketsGatewayService } from '../services/tickets-gateway.service';
import { JwtAuthGuard } from '@lagunapp-backend/auth';

@ApiTags('Admin: Tickets')
@Controller('admin/tickets')
@UseGuards(JwtAuthGuard)
export class AdminTicketsController {
  constructor(private readonly ticketsService: TicketsGatewayService) {}

  @Get('stats')
  stats() {
    return this.ticketsService.stats();
  }

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.ticketsService.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.ticketsService.cancel(id);
  }

  @Put(':id/refund')
  refund(@Param('id') id: string) {
    return this.ticketsService.refund(id);
  }

  @Put(':id/use')
  use(@Param('id') id: string) {
    return this.ticketsService.use(id);
  }
}
