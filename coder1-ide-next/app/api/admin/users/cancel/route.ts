import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/auth/supabase-db';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const ADMIN_TOKEN = process.env.ALPHA_ADMIN_TOKEN;

function verifyAdmin(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  const cookie = request.cookies.get('coder1-admin')?.value;
  if (cookie === ADMIN_TOKEN) return true;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.includes(ADMIN_TOKEN)) return true;
  return false;
}

function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Fetch user's stripe_customer_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id, coder1_pro_active')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.coder1_pro_active) {
      return NextResponse.json({ error: 'User does not have an active Pro subscription' }, { status: 400 });
    }

    // Cancel in Stripe if customer ID exists
    if (user.stripe_customer_id) {
      const stripe = getStripe();
      if (stripe) {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'active',
          limit: 5,
        });

        // Cancel all active subscriptions for this customer
        for (const sub of subscriptions.data) {
          await stripe.subscriptions.cancel(sub.id);
        }
      }
    }

    // Update DB regardless of Stripe result
    const { error: updateError } = await supabase
      .from('users')
      .update({
        coder1_pro_active: false,
        subscription_status: 'cancelled',
        subscription_tier: 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`[Admin] Cancelled subscription for user ${user.email} (${userId})`);

    return NextResponse.json({ success: true, email: user.email });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Cancel Sub] Error:', message);
    return NextResponse.json({ error: 'Failed to cancel subscription', details: message }, { status: 500 });
  }
}
