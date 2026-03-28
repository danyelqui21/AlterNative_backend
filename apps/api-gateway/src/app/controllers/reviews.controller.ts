import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReviewsGatewayService } from '../services/reviews-gateway.service';
import { JwtAuthGuard, CurrentUser } from '@lagunapp-backend/auth';

@ApiTags('Reviews / Reseñas')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsGatewayService) {}

  @Get('event/:eventId')
  getReviews(
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
  ) {
    return this.service.getReviews(eventId, parseInt(page || '1', 10));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  addReview(
    @Body() body: { eventId: string; rating: number; comment: string; photos?: string[] },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.addReview({
      ...body,
      userId,
      userName: '',
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  disableReview(@Param('id') id: string) {
    return this.service.disableReview(id);
  }
}
