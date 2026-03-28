import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGatewayService } from '../services/auth-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Auth / Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthGatewayService) {}

  @Post('register')
  register(@Body() dto: { name: string; email: string; password: string }) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('sub') userId: string) {
    return this.authService.me(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: Record<string, unknown>
  ) {
    return this.authService.updateProfile(userId, dto);
  }
}
