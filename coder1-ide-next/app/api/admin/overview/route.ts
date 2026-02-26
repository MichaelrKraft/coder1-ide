import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/auth/supabase-db';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

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

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      waitlistResult,
      waitlistNewResult,
      invitesSentResult,
      usersResult,
      usersNewResult,
      proUsersResult,
    ] = await Promise.all([
      supabase.from('alpha_waitlist').select('*', { count: 'exact', head: true }),
      supabase.from('alpha_waitlist').select('*', { count: 'exact', head: true }).gte('signup_date', sevenDaysAgo),
      supabase.from('alpha_waitlist').select('*', { count: 'exact', head: true }).eq('invite_sent', true),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('coder1_pro_active', true),
    ]);

    // Get today's cost data
    let todayCost = 0;
    let weeklyTotalCost = 0;
    try {
      const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
      const costRes = await fetch(`${baseUrl}/api/analytics/claude-usage`, { signal: AbortSignal.timeout(3000) });
      if (costRes.ok) {
        const costData = await costRes.json();
        todayCost = costData?.data?.daily?.cost ?? 0;
        weeklyTotalCost = costData?.data?.weekly?.totalCost ?? 0;
      }
    } catch {
      // cost data unavailable
    }

    // Get unread feedback count
    let unreadFeedback = 0;
    try {
      const feedbackPath = path.join(os.homedir(), '.coder1', 'alpha-feedback', 'feedback.json');
      const content = await fs.readFile(feedbackPath, 'utf-8');
      const items = JSON.parse(content);
      unreadFeedback = Array.isArray(items) ? items.filter((f: { status?: string }) => f.status === 'new' || !f.status).length : 0;
    } catch {
      // feedback file may not exist
    }

    return NextResponse.json({
      waitlist: {
        total: waitlistResult.count ?? 0,
        new7d: waitlistNewResult.count ?? 0,
        invitesSent: invitesSentResult.count ?? 0,
      },
      users: {
        total: usersResult.count ?? 0,
        new7d: usersNewResult.count ?? 0,
        proActive: proUsersResult.count ?? 0,
      },
      costs: {
        todayCost,
        weeklyTotalCost,
      },
      unreadFeedback,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Overview] Error:', message);
    return NextResponse.json({ error: 'Failed to load overview', details: message }, { status: 500 });
  }
}
