/**
 * =====================================================================
 * RABBITMQ MESSAGING SERVICE
 * =====================================================================
 *
 * ## What is RabbitMQ?
 *
 * RabbitMQ is a message broker — a post office for your services.
 * Instead of services calling each other directly (tight coupling),
 * they send messages through RabbitMQ (loose coupling).
 *
 * ## Why we use it
 *
 * We have a polyglot persistence architecture:
 * - PostgreSQL stores core relational data (users, events, artists)
 * - MongoDB stores flexible data (artist profiles, reviews, social links)
 *
 * When something changes in PostgreSQL (e.g., an artist is disabled),
 * MongoDB documents need to be updated too. Instead of the service
 * calling MongoDB directly (which creates coupling), it publishes
 * a message. A consumer picks it up and handles the cleanup.
 *
 * ## How it works
 *
 * ```
 * ┌──────────────┐     publish       ┌────────────┐     consume      ┌──────────────┐
 * │  Producer     │ ── message ───▶  │  RabbitMQ  │ ── message ──▶  │  Consumer    │
 * │  (Gateway)    │  "artist.disabled"│  Exchange  │                 │  (same svc)  │
 * │  sets PG      │                  │  "topic"   │                 │  updates     │
 * │  isActive=f   │                  │            │                 │  MongoDB     │
 * └──────────────┘                   └────────────┘                 └──────────────┘
 * ```
 *
 * 1. PRODUCER: A service does something (e.g., disables an artist in Postgres)
 *    and calls `messaging.publish('artist.disabled', { artistId: '...' })`
 *
 * 2. EXCHANGE: RabbitMQ receives the message and routes it based on the
 *    routing key pattern (e.g., 'artist.disabled' matches 'artist.*')
 *
 * 3. CONSUMER: Services that called `messaging.subscribe('artist.*', handler)`
 *    receive the message and execute their handler (e.g., deactivate MongoDB docs)
 *
 * ## Key concepts
 *
 * - EXCHANGE: Named mailbox that receives messages and routes them to queues.
 *   We use a "topic" exchange called "lagunapp.events" that routes by pattern.
 *
 * - ROUTING KEY: The "address" on the message (e.g., 'artist.disabled',
 *   'event.cancelled', 'review.created'). Uses dot-separated segments.
 *
 * - QUEUE: A buffer that holds messages until a consumer processes them.
 *   Each subscriber gets its own queue bound to the exchange.
 *
 * - PATTERN MATCHING:
 *   'artist.disabled' — matches exactly 'artist.disabled'
 *   'artist.*'        — matches 'artist.disabled', 'artist.updated', etc.
 *   'artist.#'        — matches 'artist.disabled', 'artist.profile.updated', etc.
 *
 * ## Where it's used in LagunApp
 *
 * PUBLISHERS (send messages):
 * - ArtistsGatewayService.disable()     → publishes 'artist.disabled'
 * - AdminEventsGatewayService.cancel()  → publishes 'event.cancelled'
 * - ReviewsGatewayService.addReview()   → publishes 'review.created'
 *
 * SUBSCRIBERS (receive and act on messages):
 * - ArtistsGatewayService  → subscribes to 'artist.disabled'
 *   → Deactivates the artist's MongoDB profile (socialLinks, photos, etc.)
 * - ReviewsGatewayService  → subscribes to 'event.cancelled'
 *   → Deactivates all reviews for the cancelled event in MongoDB
 *
 * ## Graceful degradation
 *
 * If RabbitMQ is not available (Docker not running, connection refused):
 * - The service logs a warning and continues without messaging
 * - Published events are dispatched to LOCAL handlers in the same process
 * - This means the system still works, just without cross-service delivery
 * - When RabbitMQ comes back, new messages flow through the broker again
 *
 * ## Configuration
 *
 * Set RABBITMQ_URL in .env:
 *   RABBITMQ_URL=amqp://lagunapp:lagunapp_dev_2026@localhost:56720
 *
 * Management UI: http://localhost:15672 (user: lagunapp, pass: lagunapp_dev_2026)
 *
 * =====================================================================
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

let amqplib: any;
try {
  amqplib = require('amqplib');
} catch {
  // amqplib not installed — messaging will be disabled
}

/**
 * Represents an event message that flows through RabbitMQ.
 *
 * @property type      - Routing key (e.g., 'artist.disabled', 'event.cancelled')
 * @property payload   - Event data (e.g., { artistId: 'uuid' })
 * @property timestamp - ISO 8601 timestamp when the event was created
 */
export interface AppEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

type EventHandler = (event: AppEvent) => Promise<void>;

/**
 * Central messaging service that abstracts RabbitMQ pub/sub.
 *
 * Usage:
 *
 * // Publishing (in a gateway service):
 * await this.messaging.publish('artist.disabled', { artistId: 'abc-123' });
 *
 * // Subscribing (in a gateway service's onModuleInit):
 * await this.messaging.subscribe('artist.disabled', async (event) => {
 *   const { artistId } = event.payload;
 *   await this.mongoModel.updateMany({ artistId }, { $set: { isActive: false } });
 * });
 */
@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private connection: any = null;
  private channel: any = null;
  private readonly handlers = new Map<string, EventHandler[]>();
  private connected = false;

  /**
   * The RabbitMQ exchange name. All LagunApp events go through this single
   * topic exchange. The routing key determines which subscribers receive
   * which messages.
   */
  private readonly EXCHANGE = 'lagunapp.events';

  constructor(private readonly config: ConfigService) {}

  /**
   * Called automatically by NestJS when the module initializes.
   * Connects to RabbitMQ and creates the topic exchange.
   * If RabbitMQ is unavailable, the service continues in local-only mode.
   */
  async onModuleInit() {
    if (!amqplib) {
      this.logger.warn('amqplib not installed — messaging disabled');
      return;
    }

    const url = this.config.get('RABBITMQ_URL', 'amqp://localhost:56720');
    try {
      // Connect to RabbitMQ broker
      this.connection = await amqplib.connect(url);
      // Create a channel (lightweight connection for sending/receiving)
      this.channel = await this.connection.createChannel();
      // Declare the exchange (creates it if it doesn't exist)
      // "topic" type means messages are routed by pattern matching on the routing key
      // "durable: true" means the exchange survives broker restarts
      await this.channel.assertExchange(this.EXCHANGE, 'topic', { durable: true });
      this.connected = true;
      this.logger.log('Connected to RabbitMQ');
    } catch (err: any) {
      this.logger.warn(`RabbitMQ not available: ${err.message}. Messaging disabled — using local dispatch only.`);
    }
  }

  /**
   * Called automatically when the module is destroyed (app shutdown).
   * Cleanly closes the channel and connection.
   */
  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // Ignore — connection may already be closed
    }
  }

  /**
   * Publish an event message to RabbitMQ.
   *
   * The message is sent to the 'lagunapp.events' exchange with the given
   * routing key (type). All subscribers whose pattern matches the key
   * will receive the message.
   *
   * If RabbitMQ is not connected, the message is dispatched to local
   * handlers only (same-process subscribers still receive it).
   *
   * @param type    - Routing key (e.g., 'artist.disabled', 'event.cancelled')
   * @param payload - Event data (e.g., { artistId: 'uuid', reason: 'admin action' })
   *
   * @example
   * // In ArtistsGatewayService:
   * await this.messaging.publish('artist.disabled', { artistId: artist.id });
   *
   * @example
   * // In AdminEventsGatewayService:
   * await this.messaging.publish('event.cancelled', { eventId: event.id });
   */
  async publish(type: string, payload: Record<string, unknown>): Promise<void> {
    const event: AppEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    if (!this.connected) {
      this.logger.debug(`[local-only] ${type}: ${JSON.stringify(payload)}`);
      // Even without RabbitMQ, dispatch to handlers registered in this process
      await this.dispatchLocal(event);
      return;
    }

    // Send to RabbitMQ exchange
    // The exchange routes the message to all queues bound with a matching pattern
    // "persistent: true" means the message survives broker restarts (stored to disk)
    this.channel.publish(
      this.EXCHANGE,
      type, // routing key
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );
    this.logger.debug(`Published: ${type}`);

    // Also dispatch locally for same-process consumers
    // (in our architecture, producers and consumers are in the same gateway process,
    // so local dispatch is the primary delivery mechanism. RabbitMQ serves as the
    // reliable backup and will be the primary when services are split into separate processes)
    await this.dispatchLocal(event);
  }

  /**
   * Subscribe to events matching a routing key pattern.
   *
   * Creates a queue bound to the exchange with the given pattern.
   * When a matching message arrives, the handler is called.
   *
   * Pattern matching:
   * - 'artist.disabled'  → matches exactly 'artist.disabled'
   * - 'artist.*'         → matches any single word after 'artist.' (e.g., 'artist.disabled', 'artist.updated')
   * - 'artist.#'         → matches any number of words after 'artist.' (e.g., 'artist.profile.updated')
   *
   * @param pattern - Routing key pattern to match
   * @param handler - Async function called when a matching message arrives
   *
   * @example
   * // In ArtistsGatewayService.onModuleInit():
   * await this.messaging.subscribe('artist.disabled', async (event) => {
   *   const { artistId } = event.payload;
   *   // Deactivate the artist's MongoDB profile
   *   await this.profileModel.updateMany({ artistId }, { $set: { isActive: false } });
   * });
   *
   * @example
   * // In ReviewsGatewayService.onModuleInit():
   * await this.messaging.subscribe('event.cancelled', async (event) => {
   *   const { eventId } = event.payload;
   *   // Deactivate all reviews for the cancelled event
   *   await this.reviewModel.updateMany({ eventId }, { $set: { isActive: false } });
   * });
   */
  async subscribe(pattern: string, handler: EventHandler): Promise<void> {
    // Always register the handler locally (works even without RabbitMQ)
    const existing = this.handlers.get(pattern) || [];
    existing.push(handler);
    this.handlers.set(pattern, existing);

    if (!this.connected) return;

    // Create a dedicated queue for this subscription
    // The queue name includes a timestamp to ensure uniqueness per instance
    // "durable: false" — queue doesn't survive broker restarts (will be recreated)
    // "autoDelete: true" — queue is deleted when the consumer disconnects
    const queueName = `lagunapp.${pattern}.${Date.now()}`;
    await this.channel.assertQueue(queueName, { durable: false, autoDelete: true });

    // Bind the queue to the exchange with the routing pattern
    // This tells RabbitMQ: "send messages matching this pattern to this queue"
    await this.channel.bindQueue(queueName, this.EXCHANGE, pattern);

    // Start consuming messages from the queue
    this.channel.consume(queueName, async (msg: any) => {
      if (!msg) return;
      try {
        const event: AppEvent = JSON.parse(msg.content.toString());
        await handler(event);
        // Acknowledge the message — tells RabbitMQ we processed it successfully
        // If we don't ack, RabbitMQ will re-deliver the message
        this.channel.ack(msg);
      } catch (err: any) {
        this.logger.error(`Error processing ${pattern}: ${err.message}`);
        // Negative acknowledge — tells RabbitMQ we failed to process
        // "false, false" = don't requeue (send to dead letter queue or discard)
        this.channel.nack(msg, false, false);
      }
    });

    this.logger.log(`Subscribed to: ${pattern}`);
  }

  /**
   * Dispatch an event to all locally registered handlers whose pattern matches.
   * This is the fallback mechanism when RabbitMQ is not available, and also
   * provides same-process delivery for the current gateway process.
   */
  private async dispatchLocal(event: AppEvent) {
    for (const [pattern, handlers] of this.handlers) {
      if (this.matchPattern(pattern, event.type)) {
        for (const handler of handlers) {
          try {
            await handler(event);
          } catch (err: any) {
            this.logger.error(`Local handler error for ${pattern}: ${err.message}`);
          }
        }
      }
    }
  }

  /**
   * Match a subscription pattern against a routing key.
   * Implements AMQP topic exchange pattern matching:
   * - '*' matches exactly one word
   * - '#' matches zero or more words
   * - Literal words match exactly
   */
  private matchPattern(pattern: string, routingKey: string): boolean {
    const patternParts = pattern.split('.');
    const keyParts = routingKey.split('.');
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] === '*') continue;
      if (patternParts[i] !== keyParts[i]) return false;
    }
    return patternParts.length === keyParts.length;
  }
}
