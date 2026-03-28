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
import { SubscriptionsGatewayService } from '../services/subscriptions-gateway.service';
import { JwtAuthGuard } from '@lagunapp-backend/auth';

@ApiTags('Admin: Subscriptions')
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard)
export class AdminSubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsGatewayService,
  ) {}

  @Get('stats')
  stats() {
    return this.subscriptionsService.stats();
  }

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.subscriptionsService.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.subscriptionsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.subscriptionsService.update(id, dto);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.subscriptionsService.cancel(id);
  }

  @Put(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.subscriptionsService.suspend(id);
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    return this.subscriptionsService.activate(id);
  }
}
