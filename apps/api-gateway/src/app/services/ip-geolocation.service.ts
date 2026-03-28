import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class IpGeolocationService {
  private readonly logger = new Logger(IpGeolocationService.name);

  /**
   * Get approximate location from IP address using free ip-api.com service.
   * Returns { city, country } or nulls if lookup fails.
   * Note: localhost/private IPs return null (only works with public IPs).
   */
  async lookup(ip: string): Promise<{ city: string | null; country: string | null }> {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { city: 'Local', country: 'Local' };
    }

    try {
      const { data } = await axios.get(`http://ip-api.com/json/${ip}?fields=city,country`, {
        timeout: 3000,
      });
      return {
        city: data.city || null,
        country: data.country || null,
      };
    } catch {
      this.logger.debug(`IP geolocation failed for ${ip}`);
      return { city: null, country: null };
    }
  }
}
