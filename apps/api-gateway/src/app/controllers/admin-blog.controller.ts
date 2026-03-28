import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminBlogGatewayService } from '../services/admin-blog-gateway.service';

@ApiTags('Admin / Blog')
@Controller('admin/blog')
export class AdminBlogController {
  constructor(private readonly service: AdminBlogGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.service.findAll(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.service.create(body as any);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.update(id, body as any);
  }

  @Put(':id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Put(':id/archive')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Put(':id/draft')
  draft(@Param('id') id: string) {
    return this.service.draft(id);
  }
}
