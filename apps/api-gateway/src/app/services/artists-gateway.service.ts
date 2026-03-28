import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { Artist } from '../entities/artist.entity';
import { ArtistProfile } from '../schemas/artist-profile.schema';
import { SpotifyService } from './spotify.service';
import { MessagingService } from '@lagunapp-backend/messaging';

@Injectable()
export class ArtistsGatewayService implements OnModuleInit {
  constructor(
    @InjectRepository(Artist)
    private readonly repo: Repository<Artist>,
    @InjectModel(ArtistProfile.name)
    private readonly profileModel: Model<ArtistProfile>,
    private readonly spotify: SpotifyService,
    private readonly messaging: MessagingService,
  ) {}

  async onModuleInit() {
    // Subscribe to artist events for MongoDB cleanup
    await this.messaging.subscribe('artist.disabled', async (event) => {
      const { artistId } = event.payload;
      await this.profileModel.updateMany(
        { artistId },
        { $set: { isActive: false } },
      );
    });
  }

  async findAll(filters: { city?: string; genre?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('a').where('a.isActive = true');

    if (filters.city) {
      qb.andWhere('a.city = :city', { city: filters.city });
    }

    qb.orderBy('a.isVerified', 'DESC').addOrderBy('a.name', 'ASC').skip(skip).take(limit);
    const artists = await qb.getMany();

    // Enrich list with MongoDB profiles (social links)
    const artistIds = artists.map((a) => a.id);
    const profiles = artistIds.length
      ? await this.profileModel.find({ artistId: { $in: artistIds }, isActive: true }).lean()
      : [];
    const profileMap = new Map(profiles.map((p: any) => [p.artistId, p]));

    return artists.map((a) => {
      const profile = profileMap.get(a.id);
      return {
        ...a,
        bio: profile?.bio || a.bio,
        socialLinks: profile?.socialLinks || null,
        photos: profile?.photos || [],
      };
    });
  }

  async findOne(id: string) {
    const artist = await this.repo.findOne({ where: { id, isActive: true } });
    if (!artist) throw new NotFoundException('Artista no encontrado');

    // Enrich with MongoDB profile
    const profile = await this.profileModel.findOne({ artistId: id, isActive: true }).lean() as any;

    // Enrich with Spotify data if available
    let spotifyData = null;
    if (artist.spotifyArtistId) {
      spotifyData = await this.spotify.getArtistData(artist.spotifyArtistId);
    }

    return {
      ...artist,
      bio: profile?.bio || artist.bio,
      socialLinks: profile?.socialLinks || null,
      photos: profile?.photos || [],
      bannerImageUrl: profile?.bannerImageUrl || null,
      customContent: profile?.customContent || null,
      spotify: spotifyData,
    };
  }

  async disable(id: string) {
    const artist = await this.repo.findOne({ where: { id } });
    if (!artist) throw new NotFoundException('Artista no encontrado');

    artist.isActive = false;
    await this.repo.save(artist);

    // Publish event — MongoDB consumer will deactivate the profile
    await this.messaging.publish('artist.disabled', { artistId: id });

    return { message: 'Artista desactivado' };
  }

  async updateProfile(artistId: string, data: Partial<ArtistProfile>) {
    let profile = await this.profileModel.findOne({ artistId });
    if (profile) {
      Object.assign(profile, data);
      return profile.save();
    }
    return this.profileModel.create({ artistId, ...data });
  }
}
