import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const HOLD_TTL_SECONDS = 600; // 10 minutes
const KEY_PREFIX = 'seat_hold';

/**
 * Redis-based seat reservation service.
 *
 * Provides temporary seat holds with automatic expiry (10 min TTL)
 * and permanent reservation verification for overbooking prevention.
 *
 * Validation chain:
 *  1. Real-time (WebSocket) — broadcast seat status to viewers
 *  2. On tap — isSeatAvailable() before allowing UI selection
 *  3. On hold — holdSeats() with atomic SET NX
 *  4. On payment — verifyHoldsForPurchase() re-checks user owns holds
 *  5. On webhook — confirmSeats() final DB write + hold cleanup
 */
@Injectable()
export class SeatReservationService implements OnModuleInit {
  private redis: any = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      const Redis = require('ioredis');
      const host = this.config.get('REDIS_HOST', 'localhost');
      const port = this.config.get('REDIS_PORT', 63790);
      const password = this.config.get('REDIS_PASSWORD', '');
      this.redis = new Redis({ host, port, password, lazyConnect: true });
      await this.redis.connect();
    } catch (_) {
      // Redis not available — seat holds disabled, DB unique constraint is safety net
    }
  }

  private key(theaterEventId: string, seatId: string): string {
    return `${KEY_PREFIX}:${theaterEventId}:${seatId}`;
  }

  /**
   * Step 2 — Check if a single seat is available (not held, not reserved).
   * Called on tap before allowing selection in the UI.
   */
  async isSeatAvailable(
    theaterEventId: string,
    seatId: string,
  ): Promise<boolean> {
    if (!this.redis) return true;
    const holder = await this.redis.get(this.key(theaterEventId, seatId));
    return holder === null;
  }

  /**
   * Step 3 — Hold multiple seats atomically for a user.
   * Uses SET NX (only-set-if-not-exists) per seat in a pipeline.
   * Returns { success, failedSeatIds } — partial holds are rolled back.
   */
  async holdSeats(
    theaterEventId: string,
    seatIds: string[],
    userId: string,
  ): Promise<{ success: boolean; failedSeatIds: string[] }> {
    if (!this.redis) {
      return { success: true, failedSeatIds: [] };
    }

    // Attempt to hold all seats atomically with pipeline
    const pipeline = this.redis.pipeline();
    for (const seatId of seatIds) {
      pipeline.set(
        this.key(theaterEventId, seatId),
        userId,
        'EX',
        HOLD_TTL_SECONDS,
        'NX',
      );
    }
    const results = await pipeline.exec();

    // Check which seats failed (SET NX returns null if key already exists)
    const failedSeatIds: string[] = [];
    const succeededKeys: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const [err, result] = results[i];
      if (err || result === null) {
        failedSeatIds.push(seatIds[i]);
      } else {
        succeededKeys.push(this.key(theaterEventId, seatIds[i]));
      }
    }

    // If any failed, rollback all successful holds
    if (failedSeatIds.length > 0 && succeededKeys.length > 0) {
      const rollbackPipeline = this.redis.pipeline();
      for (const key of succeededKeys) {
        rollbackPipeline.del(key);
      }
      await rollbackPipeline.exec();
    }

    return {
      success: failedSeatIds.length === 0,
      failedSeatIds,
    };
  }

  /**
   * Release seats held by a user (e.g., user cancels selection).
   */
  async releaseSeats(
    theaterEventId: string,
    seatIds: string[],
    userId: string,
  ): Promise<void> {
    if (!this.redis) return;

    const pipeline = this.redis.pipeline();
    for (const seatId of seatIds) {
      pipeline.get(this.key(theaterEventId, seatId));
    }
    const results = await pipeline.exec();

    const delPipeline = this.redis.pipeline();
    for (let i = 0; i < results.length; i++) {
      const [, holder] = results[i];
      if (holder === userId) {
        delPipeline.del(this.key(theaterEventId, seatIds[i]));
      }
    }
    await delPipeline.exec();
  }

  /**
   * Step 4 — Verify holds still belong to user before processing payment.
   * Called at payment initiation. Returns false if any hold expired or was stolen.
   */
  async verifyHoldsForPurchase(
    theaterEventId: string,
    seatIds: string[],
    userId: string,
  ): Promise<{ valid: boolean; expiredSeatIds: string[] }> {
    if (!this.redis) {
      return { valid: true, expiredSeatIds: [] };
    }

    const pipeline = this.redis.pipeline();
    for (const seatId of seatIds) {
      pipeline.get(this.key(theaterEventId, seatId));
    }
    const results = await pipeline.exec();

    const expiredSeatIds: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const [err, holder] = results[i];
      if (err || holder !== userId) {
        expiredSeatIds.push(seatIds[i]);
      }
    }

    return {
      valid: expiredSeatIds.length === 0,
      expiredSeatIds,
    };
  }

  /**
   * Step 5 — Confirm seats after successful payment (webhook).
   * Deletes Redis holds since seats are now permanently reserved in DB.
   */
  async confirmSeats(
    theaterEventId: string,
    seatIds: string[],
  ): Promise<void> {
    if (!this.redis) return;

    const pipeline = this.redis.pipeline();
    for (const seatId of seatIds) {
      pipeline.del(this.key(theaterEventId, seatId));
    }
    await pipeline.exec();
  }

  /**
   * Get hold status for all seats in an event.
   * Returns a map of seatId → userId (only for held seats).
   */
  async getHoldsForEvent(
    theaterEventId: string,
    seatIds: string[],
  ): Promise<Map<string, string>> {
    const holds = new Map<string, string>();
    if (!this.redis || seatIds.length === 0) return holds;

    const keys = seatIds.map((id) => this.key(theaterEventId, id));
    const values = await this.redis.mget(...keys);

    for (let i = 0; i < seatIds.length; i++) {
      if (values[i]) {
        holds.set(seatIds[i], values[i]);
      }
    }

    return holds;
  }

  /**
   * Get remaining TTL for a user's hold (for countdown timer).
   */
  async getHoldTtl(
    theaterEventId: string,
    seatId: string,
  ): Promise<number> {
    if (!this.redis) return 0;
    const ttl = await this.redis.ttl(this.key(theaterEventId, seatId));
    return ttl > 0 ? ttl : 0;
  }
}
