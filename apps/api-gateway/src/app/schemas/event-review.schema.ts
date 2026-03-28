import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'event_reviews', timestamps: true })
export class EventReview extends Document {
  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  userName: string;

  @Prop()
  userAvatarUrl: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment: string;

  @Prop([String])
  photos: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const EventReviewSchema = SchemaFactory.createForClass(EventReview);
