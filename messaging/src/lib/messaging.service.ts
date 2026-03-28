import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

let amqplib: any;
try {
  amqplib = require('amqplib');
} catch {
  // amqplib not installed — messaging will be disabled
}

export interface AppEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

type EventHandler = (event: AppEvent) => Promise<void>;

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private connection: any = null;
  private channel: any = null;
  private readonly handlers = new Map<string, EventHandler[]>();
  private connected = false;

  private readonly EXCHANGE = 'lagunapp.events';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    if (!amqplib) {
      this.logger.warn('amqplib not installed — messaging disabled');
      return;
    }

    const url = this.config.get('RABBITMQ_URL', 'amqp://localhost:56720');
    try {
      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.EXCHANGE, 'topic', { durable: true });
      this.connected = true;
      this.logger.log('Connected to RabbitMQ');
    } catch (err: any) {
      this.logger.warn(`RabbitMQ not available: ${err.message}. Messaging disabled.`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore
    }
  }

  /**
   * Publish an event to RabbitMQ.
   * Example: publish('artist.disabled', { artistId: '...' })
   */
  async publish(type: string, payload: Record<string, unknown>): Promise<void> {
    const event: AppEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    if (!this.connected) {
      this.logger.debug(`[local] ${type}: ${JSON.stringify(payload)}`);
      // Still call local handlers even without RabbitMQ
      await this.dispatchLocal(event);
      return;
    }

    this.channel.publish(
      this.EXCHANGE,
      type,
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );
    this.logger.debug(`Published: ${type}`);

    // Also dispatch locally for same-process consumers
    await this.dispatchLocal(event);
  }

  /**
   * Subscribe to events by pattern.
   * Example: subscribe('artist.*', handler)
   * Example: subscribe('artist.disabled', handler)
   */
  async subscribe(pattern: string, handler: EventHandler): Promise<void> {
    // Register local handler
    const existing = this.handlers.get(pattern) || [];
    existing.push(handler);
    this.handlers.set(pattern, existing);

    if (!this.connected) return;

    // Create a queue for this pattern
    const queueName = `lagunapp.${pattern}.${Date.now()}`;
    await this.channel.assertQueue(queueName, { durable: false, autoDelete: true });
    await this.channel.bindQueue(queueName, this.EXCHANGE, pattern);

    this.channel.consume(queueName, async (msg: any) => {
      if (!msg) return;
      try {
        const event: AppEvent = JSON.parse(msg.content.toString());
        await handler(event);
        this.channel.ack(msg);
      } catch (err: any) {
        this.logger.error(`Error processing ${pattern}: ${err.message}`);
        this.channel.nack(msg, false, false);
      }
    });

    this.logger.log(`Subscribed to: ${pattern}`);
  }

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
