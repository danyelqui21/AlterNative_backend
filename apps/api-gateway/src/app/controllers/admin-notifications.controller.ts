import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsGatewayService } from '../services/notifications-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Admin: Notifications')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard)
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsGatewayService,
  ) {}

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body()
    dto: {
      title: string;
      message: string;
      type?: string;
      priority?: string;
      targetType?: string;
      targetValue?: string;
      targetApps?: string[];
      actionUrl?: string;
      actionLabel?: string;
      scheduledAt?: string;
    },
  ) {
    return this.notificationsService.createNotification(dto, userId);
  }

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.notificationsService.getNotifications(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.getNotification(id);
  }

  @Put(':id/schedule')
  schedule(
    @Param('id') id: string,
    @Body() dto: { scheduledAt: string },
  ) {
    return this.notificationsService.scheduleNotification(id, dto.scheduledAt);
  }
}
