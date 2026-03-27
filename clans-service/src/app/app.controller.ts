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
import { AppService } from './app.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';
import { CreateClanDto } from './dto/create-clan.dto';
import { UpdateClanDto } from './dto/update-clan.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ShareEventDto } from './dto/share-event.dto';

@Controller('clans')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.appService.findAll(filters as any);
  }

  @Get('can-create')
  @UseGuards(JwtAuthGuard)
  canCreate(@CurrentUser('sub') userId: string) {
    return this.appService.canCreate(userId);
  }

  @Get('my-clans')
  @UseGuards(JwtAuthGuard)
  myClans(@CurrentUser('sub') userId: string) {
    return this.appService.myClans(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateClanDto, @CurrentUser('sub') userId: string) {
    return this.appService.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClanDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.appService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.appService.delete(id, userId);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  join(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.appService.join(id, userId);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  leave(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.appService.leave(id, userId);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
  ) {
    return this.appService.getMessages(id, userId, parseInt(page || '1', 10));
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.appService.sendMessage(id, userId, dto);
  }

  @Post('share-event')
  @UseGuards(JwtAuthGuard)
  shareEvent(@Body() dto: ShareEventDto, @CurrentUser('sub') userId: string) {
    return this.appService.shareEvent(userId, dto);
  }

  @Post(':id/ticket-share')
  @UseGuards(JwtAuthGuard)
  ticketPurchaseShare(
    @Param('id') id: string,
    @Body('eventId') eventId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.appService.ticketPurchaseShare(id, userId, eventId);
  }
}
