import { NextRequest, NextResponse } from 'next/server';
import { memoryTrialService } from '@/services/memory-trial-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, planType = 'pro' } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // For GitHub Pages deployment, we'll simulate the upgrade
    // In production, this would integrate with Stripe
    const STRIPE_ENABLED = process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production';

    if (STRIPE_ENABLED) {
      // TODO: Integrate with Stripe
      // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // const session = await stripe.checkout.sessions.create({
      //   payment_method_types: ['card'],
      //   line_items: [{
      //     price_data: {
      //       currency: 'usd',
      //       product_data: {
      //         name: 'Coder1 Pro - Eternal Memory',
      //         description: 'Never lose context again with unlimited eternal memory'
      //       },
      //       unit_amount: 2900, // $29.00
      //       recurring: {
      //         interval: 'month'
      //       }
      //     },
      //     quantity: 1
      //   }],
      //   mode: 'subscription',
      //   success_url: `${process.env.FRONTEND_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      //   cancel_url: `${process.env.FRONTEND_URL}/upgrade/cancelled`,
      //   client_reference_id: userId
      // });

      // return NextResponse.json({
      //   success: true,
      //   checkoutUrl: session.url
      // });
    } else {
      // For demo/GitHub Pages: simulate successful upgrade
      const success = memoryTrialService.upgradeToPaid(userId);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Successfully upgraded to Pro! Your eternal memory is now active.',
          simulatedUpgrade: true
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to upgrade user' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const trialStatus = memoryTrialService.getTrialStatus(userId);
    
    return NextResponse.json({
      success: true,
      trialStatus
    });
  } catch (error) {
    console.error('Trial status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}