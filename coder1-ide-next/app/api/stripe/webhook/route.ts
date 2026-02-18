import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getUserByStripeCustomerId,
  getUserByEmail,
  activateCoder1Pro,
  deactivateCoder1Pro,
  updateUserStripeCustomerId,
} from '@/lib/auth';

// Initialize Stripe lazily to avoid build-time errors
function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 400 }
        );
      }
    } else {
      // In development without webhook secret, parse directly (NOT for production)
      console.warn('⚠️ Webhook secret not configured - skipping signature verification');
      event = JSON.parse(body) as Stripe.Event;
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Checkout completed:', {
          sessionId: session.id,
          customerEmail: session.customer_email,
          customerId: session.customer,
          subscriptionId: session.subscription,
        });

        // Find user by email and activate Pro
        if (session.customer_email) {
          const user = await getUserByEmail(session.customer_email);
          if (user) {
            // Update stripe_customer_id if not set
            if (!user.stripe_customer_id && session.customer) {
              await updateUserStripeCustomerId(user.id, session.customer as string);
            }
            // Activate Coder1 Pro
            await activateCoder1Pro(user.id);
            console.log(`✅ Activated Coder1 Pro for user: ${user.email}`);
          } else {
            console.warn(`User not found for email: ${session.customer_email}`);
          }
        }

        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('📦 Subscription created:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        console.log('🔄 Subscription updated:', {
          subscriptionId: subscription.id,
          customerId,
          status: subscription.status,
        });

        // Handle subscription status changes
        if (customerId) {
          const user = await getUserByStripeCustomerId(customerId);
          if (user) {
            if (subscription.status === 'active') {
              // Subscription reactivated
              await activateCoder1Pro(user.id);
              console.log(`✅ Reactivated Coder1 Pro for user: ${user.email}`);
            } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
              // Grace period - keep Pro active but log warning
              console.warn(`⚠️ Subscription ${subscription.status} for user: ${user.email}`);
            } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
              // Deactivate Pro
              await deactivateCoder1Pro(user.id);
              console.log(`❌ Deactivated Coder1 Pro for user: ${user.email} (status: ${subscription.status})`);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        console.log('❌ Subscription canceled:', {
          subscriptionId: subscription.id,
          customerId,
        });

        // Find user by Stripe customer ID and deactivate Pro
        if (customerId) {
          const user = await getUserByStripeCustomerId(customerId);
          if (user) {
            await deactivateCoder1Pro(user.id);
            console.log(`❌ Deactivated Coder1 Pro for user: ${user.email}`);
          } else {
            console.warn(`User not found for customer: ${customerId}`);
          }
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Payment succeeded:', {
          invoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
          customerEmail: invoice.customer_email,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn('❌ Payment failed:', {
          invoiceId: invoice.id,
          customerEmail: invoice.customer_email,
        });

        // TODO: Send payment failed notification
        // await sendPaymentFailedEmail(invoice.customer_email);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Note: In Next.js 14 App Router, we use request.text() to get raw body
// This allows Stripe signature verification to work correctly
