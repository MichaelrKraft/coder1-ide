import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      return NextResponse.json(
        { error: 'Stripe Pro price ID is not configured' },
        { status: 500 }
      );
    }

    // Get customer email from request body (optional)
    const body = await request.json().catch(() => ({}));
    const customerEmail = body.email;

    // Get the origin for redirect URLs
    const origin = request.headers.get('origin') || 'http://localhost:3001';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      // Success URL - redirect to IDE with session ID for verification
      success_url: `${origin}/ide?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      // Cancel URL - return to pricing section
      cancel_url: `${origin}/alpha#pricing`,
      // Customer email if provided
      ...(customerEmail && { customer_email: customerEmail }),
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address
      billing_address_collection: 'auto',
      // Metadata for tracking
      metadata: {
        source: 'coder1_alpha_landing',
        plan: 'pro',
      },
    });

    // Return the checkout URL
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve session status (for success page verification)
export async function GET(request: NextRequest) {
  try {
    const stripe = getStripe();

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      subscriptionId: session.subscription,
    });
  } catch (error) {
    console.error('Stripe session retrieval error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
