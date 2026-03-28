import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventReview } from '../schemas/event-review.schema';
import { MessagingService } from '@lagunapp-backend/messaging';

@Injectable()
export class ReviewsGatewayService implements OnModuleInit {
  constructor(
    @InjectModel(EventReview.name)
    private readonly reviewModel: Model<EventReview>,
    private readonly messaging: MessagingService,
  ) {}

  async onModuleInit() {
    // When an event is cancelled, deactivate its reviews
    await this.messaging.subscribe('event.cancelled', async (event) => {
      const { eventId } = event.payload;
      await this.reviewModel.updateMany(
        { eventId },
        { $set: { isActive: false } },
      );
    });
  }

  async getReviews(eventId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const reviews = await this.reviewModel
      .find({ eventId, isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.reviewModel.countDocuments({ eventId, isActive: true });
    const avgResult = await this.reviewModel.aggregate([
      { $match: { eventId, isActive: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        averageRating: avgResult[0]?.avg ?? 0,
        reviewCount: avgResult[0]?.count ?? 0,
      },
    };
  }

  async addReview(data: {
    eventId: string;
    userId: string;
    userName: string;
    userAvatarUrl?: string;
    rating: number;
    comment: string;
    photos?: string[];
  }) {
    const review = await this.reviewModel.create(data);
    await this.messaging.publish('review.created', {
      reviewId: review.id,
      eventId: data.eventId,
      userId: data.userId,
      rating: data.rating,
    });
    return review;
  }

  async disableReview(reviewId: string) {
    await this.reviewModel.updateOne(
      { _id: reviewId },
      { $set: { isActive: false } },
    );
    return { message: 'Resena desactivada' };
  }
}
