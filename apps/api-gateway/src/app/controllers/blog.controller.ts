import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminBlogGatewayService } from '../services/admin-blog-gateway.service';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly service: AdminBlogGatewayService) {}

  @Get()
  findAll(@Query() filters: Record<string, unknown>) {
    return this.service.findPublished(filters as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findPublishedOne(id);
  }
}
