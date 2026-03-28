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
import { JwtAuthGuard } from '@lagunapp-backend/auth';
import { AdminEventsGatewayService } from '../services/admin-events-gateway.service';

@ApiTags('Admin: Events / Eventos')
@Controller('admin/events')
@UseGuards(JwtAuthGuard)
export class AdminEventsController {
  constructor(
    private readonly adminEventsService: AdminEventsGatewayService,
  ) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.adminEventsService.findAll(filters as any);
  }

  @Get('stats')
  getStats() {
    return this.adminEventsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminEventsService.findOne(id);
  }

  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.adminEventsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.adminEventsService.update(id, dto);
  }

  @Put(':id/feature')
  toggleFeatured(@Param('id') id: string) {
    return this.adminEventsService.toggleFeatured(id);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.adminEventsService.cancel(id);
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    return this.adminEventsService.activate(id);
  }
}
