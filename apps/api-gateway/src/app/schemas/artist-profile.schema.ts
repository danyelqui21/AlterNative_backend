import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'artist_profiles', timestamps: true })
export class ArtistProfile extends Document {
  @Prop({ required: true, index: true })
  artistId: string;

  @Prop()
  bio: string;

  @Prop({ type: Object })
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
    soundcloud?: string;
    website?: string;
  };

  @Prop([String])
  photos: string[];

  @Prop()
  bannerImageUrl: string;

  @Prop()
  shortBio: string;

  @Prop({ type: Object })
  customContent: Record<string, unknown>;

  @Prop({ default: true })
  isActive: boolean;
}

export const ArtistProfileSchema = SchemaFactory.createForClass(ArtistProfile);
