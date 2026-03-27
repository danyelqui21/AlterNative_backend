import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.appService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.appService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('sub') userId: string) {
    return this.appService.me(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto
  ) {
    return this.appService.updateProfile(userId, dto);
  }
}
