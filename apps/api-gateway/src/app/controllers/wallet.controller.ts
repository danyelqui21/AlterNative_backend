import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletsGatewayService } from '../services/wallets-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletsService: WalletsGatewayService) {}

  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.walletsService.findMyWallet(userId);
  }

  @Post('topup')
  topup(
    @CurrentUser('sub') userId: string,
    @Body() dto: { amount: number },
  ) {
    return this.walletsService.topup(userId, dto);
  }
}
