import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

let Stripe: any;
try {
  Stripe = require('stripe');
} catch {
  // stripe package not available
}

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: any = null;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const key = this.config.get('STRIPE_SECRET_KEY', '');
    if (!key || key === 'sk_test_your_stripe_test_key') {
      this.logger.warn('Stripe not configured — payments disabled');
      return;
    }
    this.stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
    this.logger.log('Stripe initialized');
  }

  get isConfigured(): boolean {
    return !!this.stripe;
  }

  async createCustomer(email: string, name: string): Promise<string | null> {
    if (!this.stripe) return null;
    const customer = await this.stripe.customers.create({ email, name });
    return customer.id;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    description?: string,
  ) {
    if (!this.stripe) throw new Error('Stripe not configured');
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency,
      customer: customerId,
      description,
      automatic_payment_methods: { enabled: true },
    });
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    if (!this.stripe) return null;
    return this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async detachPaymentMethod(paymentMethodId: string) {
    if (!this.stripe) return null;
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async listPaymentMethods(customerId: string) {
    if (!this.stripe) return [];
    const result = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return result.data;
  }

  async constructWebhookEvent(body: Buffer, sig: string) {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET', '');
    return this.stripe.webhooks.constructEvent(body, sig, secret);
  }

  async refundPayment(paymentIntentId: string) {
    if (!this.stripe) return null;
    return this.stripe.refunds.create({ payment_intent: paymentIntentId });
  }
}
