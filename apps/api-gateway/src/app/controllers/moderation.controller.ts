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
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';
import { ModerationGatewayService } from '../services/moderation-gateway.service';

@ApiTags('Admin: Moderation / Moderacion')
@Controller('admin/moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationGatewayService,
  ) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.moderationService.findAll(filters as any);
  }

  @Get('stats')
  getStats() {
    return this.moderationService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.moderationService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: { type: string; targetId: string; targetName?: string; reason: string; details?: string },
    @CurrentUser('sub') reporterId: string,
    @CurrentUser('name') reporterName: string,
  ) {
    return this.moderationService.create(dto, reporterId, reporterName);
  }

  @Put(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: { resolution?: string },
    @CurrentUser('sub') reviewedBy: string,
  ) {
    return this.moderationService.review(id, reviewedBy, dto.resolution);
  }

  @Put(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() dto: { resolution?: string },
    @CurrentUser('sub') reviewedBy: string,
  ) {
    return this.moderationService.resolve(id, reviewedBy, dto.resolution);
  }

  @Put(':id/dismiss')
  dismiss(
    @Param('id') id: string,
    @Body() dto: { resolution?: string },
    @CurrentUser('sub') reviewedBy: string,
  ) {
    return this.moderationService.dismiss(id, reviewedBy, dto.resolution);
  }
}
