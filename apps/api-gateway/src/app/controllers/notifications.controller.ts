import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsGatewayService } from '../services/notifications-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsGatewayService,
  ) {}

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getUserNotifications(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('pending-dialogs')
  pendingDialogs(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getPendingDialogs(userId);
  }

  @Put('read-all')
  readAll(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Put(':id/read')
  markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Put(':id/dismiss')
  dismiss(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.dismissDialog(userId, id);
  }

  @Post('fcm-token')
  registerFcmToken(
    @CurrentUser('sub') userId: string,
    @Body() dto: { token: string; platform: string; appName?: string },
  ) {
    return this.notificationsService.registerFcmToken(
      userId,
      dto.token,
      dto.platform,
      dto.appName,
    );
  }

  @Delete('fcm-token')
  unregisterFcmToken(@Body() dto: { token: string }) {
    return this.notificationsService.unregisterFcmToken(dto.token);
  }
}
