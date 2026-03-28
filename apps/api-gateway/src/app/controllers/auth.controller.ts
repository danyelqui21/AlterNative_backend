import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGatewayService } from '../services/auth-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Auth / Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthGatewayService) {}

  @Post('register')
  register(
    @Body() dto: {
      name: string;
      lastName?: string;
      email: string;
      username?: string;
      password: string;
      confirmPassword: string;
      phoneCountryCode?: string;
      phone?: string;
      birthDate?: string;
      avatarUrl?: string;
    },
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const secChUa = req.headers['sec-ch-ua'] as string;
    return this.authService.register(dto, userAgent, ip, secChUa);
  }

  @Post('login')
  login(
    @Body() dto: { emailOrUsername: string; password: string },
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const secChUa = req.headers['sec-ch-ua'] as string;
    return this.authService.login(dto, userAgent, ip, secChUa);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: { emailOrUsername: string }) {
    return this.authService.forgotPassword(dto.emailOrUsername);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: { token: string; newPassword: string }) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('verify-reset-token')
  verifyResetToken(@Body() dto: { token: string }) {
    return this.authService.verifyResetToken(dto.token);
  }

  @Post('refresh')
  refreshToken(@Body() dto: { refreshToken: string }) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  getSessions(@CurrentUser('sub') userId: string) {
    return this.authService.getDeviceSessions(userId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  closeSession(
    @CurrentUser('sub') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.authService.closeSession(userId, sessionId);
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  async closeAllSessions(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tid') tokenId: string,
  ) {
    // Exclude the current session by finding its ID via tokenId
    return this.authService.closeAllSessionsByTokenId(userId, tokenId);
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
    @Body() dto: Record<string, unknown>,
  ) {
    return this.authService.updateProfile(userId, dto);
  }
}
