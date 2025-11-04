/**
 * Billing API Endpoints
 * Stripe integration for $29/month Pro subscriptions
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { billingService } from '../services/billing-service';

export const billingRouter = Router();

/**
 * Create a new subscription
 * POST /api/premium/billing/subscribe
 */
billingRouter.post('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, email, paymentMethodId } = req.body;

    if (!userId || !email || !paymentMethodId) {
      throw new ValidationError('Missing required fields: userId, email, paymentMethodId');
    }

    const subscription = await billingService.createSubscription(userId, email, paymentMethodId);

    res.json({
      success: true,
      message: 'Welcome to Coder1 Pro!',
      userId,
      subscriptionId: subscription.subscriptionId,
      plan: subscription.plan,
      amount: subscription.amount,
      currency: subscription.currency,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel a subscription
 * POST /api/premium/billing/cancel
 */
billingRouter.post('/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, subscriptionId } = req.body;

    if (!userId || !subscriptionId) {
      throw new ValidationError('Missing required fields: userId, subscriptionId');
    }

    await billingService.cancelSubscription(subscriptionId);

    res.json({
      success: true,
      message: 'Your subscription has been canceled. Memory will be preserved for 30 days.',
      userId,
      subscriptionId,
      canceledAt: new Date().toISOString(),
      preservationPeriod: '30 days',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get subscription status
 * GET /api/premium/billing/status
 */
billingRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      throw new ValidationError('Missing required query parameter: userId');
    }

    const subscription = await billingService.getSubscription(userId as string);

    if (!subscription) {
      res.json({
        success: true,
        userId,
        subscriptionId: null,
        plan: 'free',
        status: 'inactive',
        amount: 0,
        currency: 'usd',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      userId,
      subscriptionId: subscription.subscriptionId,
      plan: subscription.plan,
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Handle Stripe webhooks
 * POST /api/premium/billing/webhook
 */
billingRouter.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      throw new ValidationError('Missing Stripe signature');
    }

    const event = billingService.constructWebhookEvent(req.body, signature);
    await billingService.handleWebhookEvent(event);

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Create Stripe Checkout session
 * POST /api/premium/billing/checkout
 */
billingRouter.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, email, successUrl, cancelUrl } = req.body;

    if (!userId || !email || !successUrl || !cancelUrl) {
      throw new ValidationError('Missing required fields: userId, email, successUrl, cancelUrl');
    }

    const session = await billingService.createCheckoutSession(userId, email, successUrl, cancelUrl);

    res.json({
      success: true,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update payment method
 * POST /api/premium/billing/payment-method
 */
billingRouter.post('/payment-method', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, subscriptionId, paymentMethodId } = req.body;

    if (!userId || !subscriptionId || !paymentMethodId) {
      throw new ValidationError('Missing required fields: userId, subscriptionId, paymentMethodId');
    }

    await billingService.updatePaymentMethod(subscriptionId, paymentMethodId);

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      userId,
      subscriptionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
