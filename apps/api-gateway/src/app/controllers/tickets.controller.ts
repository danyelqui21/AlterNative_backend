import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import * as QRCode from 'qrcode';
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

  @Post('buy')
  @UseGuards(JwtAuthGuard)
  buy(
    @CurrentUser('sub') userId: string,
    @Body() dto: { eventId: string; ticketTypeId: string; quantity?: number },
  ) {
    return this.ticketsService.buy(userId, dto);
  }

  /**
   * Returns the ticket's QR code as a PNG image.
   * The user must own the ticket. Apps can render this directly in an <img> tag
   * or Flutter's Image.network().
   *
   * GET /api/tickets/:id/qr
   */
  @Get(':id/qr')
  @UseGuards(JwtAuthGuard)
  async getQr(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Res() res: Response,
  ) {
    const ticket = await this.ticketsService.findOne(id);
    if (ticket.userId !== userId) {
      throw new NotFoundException('Ticket no encontrado');
    }
    if (!ticket.qrCode) {
      throw new NotFoundException('Este ticket no tiene QR');
    }

    const png = await QRCode.toBuffer(ticket.qrCode, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.end(png);
  }
}
