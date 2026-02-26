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

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Query subscription data from DB
    const [activeResult, cancelledResult, pastDueResult, new30dResult, new7dResult] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('coder1_pro_active', true).eq('subscription_status', 'active'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'cancelled'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'past_due'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('coder1_pro_active', true).gte('updated_at', thirtyDaysAgo),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('coder1_pro_active', true).gte('updated_at', sevenDaysAgo),
    ]);

    const activeCount = activeResult.count ?? 0;
    const cancelledCount = cancelledResult.count ?? 0;
    const pastDueCount = pastDueResult.count ?? 0;

    // Get pricing and recent transactions from Stripe
    let proPriceAmount = 0;
    let recentCharges: Array<{ id: string; email: string; amount: number; status: string; date: string }> = [];

    const stripe = getStripe();
    if (stripe && process.env.STRIPE_PRO_PRICE_ID) {
      try {
        const [priceData, chargesData] = await Promise.all([
          stripe.prices.retrieve(process.env.STRIPE_PRO_PRICE_ID),
          stripe.charges.list({ limit: 10 }),
        ]);
        proPriceAmount = (priceData.unit_amount ?? 0) / 100; // convert cents to dollars
        recentCharges = chargesData.data.map(charge => ({
          id: charge.id,
          email: charge.billing_details?.email ?? 'Unknown',
          amount: charge.amount / 100,
          status: charge.status,
          date: new Date(charge.created * 1000).toISOString(),
        }));
      } catch (stripeErr) {
        console.error('[Admin Revenue] Stripe error:', stripeErr);
      }
    }

    const mrr = activeCount * proPriceAmount;

    return NextResponse.json({
      subscriptions: {
        active: activeCount,
        cancelled: cancelledCount,
        pastDue: pastDueCount,
        new7d: new7dResult.count ?? 0,
        new30d: new30dResult.count ?? 0,
      },
      mrr,
      proPriceAmount,
      recentCharges,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Revenue] Error:', message);
    return NextResponse.json({ error: 'Failed to load revenue data', details: message }, { status: 500 });
  }
}
