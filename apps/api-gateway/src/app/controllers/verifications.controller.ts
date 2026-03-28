import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VerificationsGatewayService } from '../services/verifications-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Verifications')
@Controller('verifications')
@UseGuards(JwtAuthGuard)
export class VerificationsController {
  constructor(
    private readonly verificationsService: VerificationsGatewayService,
  ) {}

  @Post()
  submit(
    @CurrentUser('sub') userId: string,
    @Body() dto: { type: string; documents?: string[]; notes?: string },
  ) {
    return this.verificationsService.submit(userId, dto);
  }

  @Get('my')
  my(@CurrentUser('sub') userId: string) {
    return this.verificationsService.findMy(userId);
  }
}
