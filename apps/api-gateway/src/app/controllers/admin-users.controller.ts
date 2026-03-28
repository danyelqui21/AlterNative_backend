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
import { JwtAuthGuard } from '@lagunapp-backend/auth';
import { AdminUsersGatewayService } from '../services/admin-users-gateway.service';

@ApiTags('Admin: Users / Usuarios')
@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.adminUsersService.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.adminUsersService.update(id, dto);
  }

  @Put(':id/enable')
  enable(@Param('id') id: string) {
    return this.adminUsersService.enable(id);
  }

  @Put(':id/disable')
  disable(@Param('id') id: string) {
    return this.adminUsersService.disable(id);
  }

  @Put(':id/verify')
  verify(@Param('id') id: string) {
    return this.adminUsersService.verify(id);
  }

  @Put(':id/role')
  changeRole(
    @Param('id') id: string,
    @Body() dto: { role: string },
  ) {
    return this.adminUsersService.changeRole(id, dto.role);
  }
}
