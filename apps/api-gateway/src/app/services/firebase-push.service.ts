import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebasePushService implements OnModuleInit {
  private readonly logger = new Logger(FirebasePushService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn(
        'Firebase not configured — push notifications disabled',
      );
      return;
    }

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        });
      }
      this.initialized = true;
      this.logger.log('Firebase Admin initialized');
    } catch (err) {
      this.logger.error('Firebase init failed', err);
    }
  }

  async sendPush(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.initialized || tokens.length === 0) return;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data: data || {},
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `Push sent: ${response.successCount} success, ${response.failureCount} failure`,
      );
    } catch (err) {
      this.logger.error('Push send failed', err);
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.initialized) return;

    try {
      await admin.messaging().send({
        topic,
        notification: { title, body },
        data: data || {},
      });
      this.logger.log(`Push sent to topic: ${topic}`);
    } catch (err) {
      this.logger.error(`Push to topic ${topic} failed`, err);
    }
  }
}
