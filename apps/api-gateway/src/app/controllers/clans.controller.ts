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
import { ClansGatewayService } from '../services/clans-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@Controller('clans')
export class ClansController {
  constructor(private readonly clansService: ClansGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.clansService.findAll(filters as any);
  }

  @Get('can-create')
  @UseGuards(JwtAuthGuard)
  canCreate(@CurrentUser('sub') userId: string) {
    return this.clansService.canCreate(userId);
  }

  @Get('my-clans')
  @UseGuards(JwtAuthGuard)
  myClans(@CurrentUser('sub') userId: string) {
    return this.clansService.myClans(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clansService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: Record<string, unknown>, @CurrentUser('sub') userId: string) {
    return this.clansService.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clansService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.clansService.delete(id, userId);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  join(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.clansService.join(id, userId);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  leave(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.clansService.leave(id, userId);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
  ) {
    return this.clansService.getMessages(id, userId, parseInt(page || '1', 10));
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  sendMessage(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clansService.sendMessage(id, userId, dto);
  }

  @Post('share-event')
  @UseGuards(JwtAuthGuard)
  shareEvent(@Body() dto: Record<string, unknown>, @CurrentUser('sub') userId: string) {
    return this.clansService.shareEvent(userId, dto);
  }

  @Post(':id/ticket-share')
  @UseGuards(JwtAuthGuard)
  ticketPurchaseShare(
    @Param('id') id: string,
    @Body('eventId') eventId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clansService.ticketPurchaseShare(id, userId, eventId);
  }
}
