import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SpotifyTrack {
  name: string;
  previewUrl: string | null;
  albumName: string;
  albumImageUrl: string;
  externalUrl: string;
  durationMs: number;
}

interface SpotifyArtistData {
  name: string;
  imageUrl: string | null;
  followers: number;
  popularity: number;
  genres: string[];
  externalUrl: string;
  topTracks: SpotifyTrack[];
}

@Injectable()
export class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientId = this.config.get('SPOTIFY_CLIENT_ID', '');
    const clientSecret = this.config.get('SPOTIFY_CLIENT_SECRET', '');

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const { data } = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      },
    );

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  async getArtistData(spotifyArtistId: string): Promise<SpotifyArtistData | null> {
    try {
      const token = await this.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [artistRes, tracksRes] = await Promise.all([
        axios.get(`https://api.spotify.com/v1/artists/${spotifyArtistId}`, { headers }),
        axios.get(`https://api.spotify.com/v1/artists/${spotifyArtistId}/top-tracks`, {
          headers,
          params: { market: 'MX' },
        }),
      ]);

      const artist = artistRes.data;
      const tracks = tracksRes.data.tracks || [];

      return {
        name: artist.name,
        imageUrl: artist.images?.[0]?.url || null,
        followers: artist.followers?.total || 0,
        popularity: artist.popularity || 0,
        genres: artist.genres || [],
        externalUrl: artist.external_urls?.spotify || '',
        topTracks: tracks.slice(0, 5).map((t: any) => ({
          name: t.name,
          previewUrl: t.preview_url,
          albumName: t.album?.name || '',
          albumImageUrl: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '',
          externalUrl: t.external_urls?.spotify || '',
          durationMs: t.duration_ms || 0,
        })),
      };
    } catch {
      return null;
    }
  }
}
