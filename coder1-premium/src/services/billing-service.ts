/**
 * Billing Service - Stripe Integration
 * Handles $9/month Alpha subscriptions with 30-day free trial
 */

import Stripe from 'stripe';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/error-handler';

interface Subscription {
  userId: string;
  subscriptionId: string;
  customerId: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

class BillingService {
  private stripe: Stripe | null = null;
  private pool: Pool;
  private readonly PRICE_ID: string;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.PRICE_ID = process.env.STRIPE_PRICE_ID || '';

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', err);
    });
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        logger.error('STRIPE_SECRET_KEY not found in environment variables');
        logger.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('STRIPE')));
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
      }
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
      logger.info('Stripe client initialized successfully');
    }
    return this.stripe;
  }

  /**
   * Create a new subscription with Stripe Checkout
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    try {
      let customerId: string | undefined;

      const customerResult = await this.pool.query(
        `SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1`,
        [userId]
      );

      if (customerResult.rows.length > 0 && customerResult.rows[0].stripe_customer_id) {
        customerId = customerResult.rows[0].stripe_customer_id;
      } else {
        const customer = await this.getStripe().customers.create({
          email,
          metadata: { userId },
        });
        customerId = customer.id;
      }

      const session = await this.getStripe().checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: this.PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
        },
        subscription_data: {
          trial_period_days: 30,
          metadata: {
            userId,
          },
        },
      });

      logger.info(`Checkout session created for user ${userId}: ${session.id}`);

      return {
        checkoutUrl: session.url!,
        sessionId: session.id,
      };
    } catch (error) {
      logger.error('Error creating checkout session', error);
      throw error;
    }
  }

  /**
   * Create subscription with payment method ID
   */
  async createSubscription(userId: string, email: string, paymentMethodId: string): Promise<Subscription> {
    try {
      const customer = await this.getStripe().customers.create({
        email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
        metadata: { userId },
      });

      const subscription = await this.getStripe().subscriptions.create({
        customer: customer.id,
        items: [{ price: this.PRICE_ID }],
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId },
      });

      await this.storeSubscription(userId, subscription);

      logger.info(`Subscription created for user ${userId}: ${subscription.id}`);

      return this.mapStripeSubscription(userId, customer.id, subscription);
    } catch (error) {
      logger.error('Error creating subscription', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.getStripe().subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      const client = await this.pool.connect();
      try {
        await client.query(
          `UPDATE subscriptions
           SET cancel_at_period_end = true, canceled_at = NOW(), updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [subscriptionId]
        );

        logger.info(`Subscription canceled: ${subscriptionId}`);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error canceling subscription', error);
      throw error;
    }
  }

  /**
   * Get subscription for a user
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM subscriptions WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        userId: row.user_id,
        subscriptionId: row.stripe_subscription_id,
        customerId: row.stripe_customer_id,
        plan: row.plan,
        status: row.status,
        amount: row.amount,
        currency: row.currency,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        canceledAt: row.canceled_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(subscriptionId: string, paymentMethodId: string): Promise<void> {
    try {
      const subscription = await this.getStripe().subscriptions.retrieve(subscriptionId);

      await this.getStripe().paymentMethods.attach(paymentMethodId, {
        customer: subscription.customer as string,
      });

      await this.getStripe().customers.update(subscription.customer as string, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      logger.info(`Payment method updated for subscription ${subscriptionId}`);
    } catch (error) {
      logger.error('Error updating payment method', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      logger.error(`Error handling webhook event ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Construct webhook event from request
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    return this.getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Store subscription in database
   */
  private async storeSubscription(userId: string, subscription: Stripe.Subscription): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO subscriptions
         (user_id, stripe_subscription_id, stripe_customer_id, plan, status, amount, currency,
          current_period_start, current_period_end, cancel_at_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id)
         DO UPDATE SET
           stripe_subscription_id = $2,
           stripe_customer_id = $3,
           status = $5,
           amount = $6,
           currency = $7,
           current_period_start = $8,
           current_period_end = $9,
           cancel_at_period_end = $10,
           updated_at = NOW()`,
        [
          userId,
          subscription.id,
          subscription.customer as string,
          'pro',
          subscription.status,
          900,
          'usd',
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
          subscription.cancel_at_period_end,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Handle subscription update webhook
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) {
      logger.warn(`Subscription ${subscription.id} has no userId in metadata`);
      return;
    }

    await this.storeSubscription(userId, subscription);
    logger.info(`Subscription updated for user ${userId}: ${subscription.status}`);
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE subscriptions
         SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
         WHERE stripe_subscription_id = $1`,
        [subscription.id]
      );

      logger.info(`Subscription deleted: ${subscription.id}`);
    } finally {
      client.release();
    }
  }

  /**
   * Handle successful payment webhook
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Payment succeeded for invoice ${invoice.id}`);
  }

  /**
   * Handle failed payment webhook
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn(`Payment failed for invoice ${invoice.id}`);
  }

  /**
   * Map Stripe subscription to internal format
   */
  private mapStripeSubscription(
    userId: string,
    customerId: string,
    subscription: Stripe.Subscription
  ): Subscription {
    return {
      userId,
      subscriptionId: subscription.id,
      customerId,
      plan: 'pro',
      status: subscription.status,
      amount: 900,
      currency: 'usd',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: null,
    };
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Billing service database pool closed');
  }
}

// Lazy initialization to avoid reading env vars during import
let billingServiceInstance: BillingService | null = null;

const getBillingService = (): BillingService => {
  if (!billingServiceInstance) {
    billingServiceInstance = new BillingService();
  }
  return billingServiceInstance;
};

// Proxy to lazy-load on first access
export const billingService = new Proxy({} as BillingService, {
  get(target, prop) {
    return (getBillingService() as any)[prop];
  }
});
