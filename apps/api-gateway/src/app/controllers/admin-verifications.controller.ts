import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VerificationsGatewayService } from '../services/verifications-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Admin: Verifications')
@Controller('admin/verifications')
@UseGuards(JwtAuthGuard)
export class AdminVerificationsController {
  constructor(
    private readonly verificationsService: VerificationsGatewayService,
  ) {}

  @Get('stats')
  stats() {
    return this.verificationsService.stats();
  }

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.verificationsService.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.verificationsService.findOne(id);
  }

  @Put(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser('sub') reviewerId: string,
  ) {
    return this.verificationsService.approve(id, reviewerId);
  }

  @Put(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser('sub') reviewerId: string,
    @Body() dto: { rejectionReason: string },
  ) {
    return this.verificationsService.reject(id, reviewerId, dto);
  }

  @Put(':id/in-review')
  inReview(@Param('id') id: string) {
    return this.verificationsService.setInReview(id);
  }
}
