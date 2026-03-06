import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/admin-auth';
import { getUserTokenUsage, getTeamTokenUsage } from '@/lib/token-attribution-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const url = request.nextUrl;
    const userId = url.searchParams.get('userId') ?? undefined;
    const startDate = url.searchParams.get('startDate') ?? undefined;
    const endDate = url.searchParams.get('endDate') ?? undefined;

    if (userId) {
      // Per-user breakdown by provider/model
      const usage = getUserTokenUsage(userId, startDate, endDate);
      return NextResponse.json({ userId, data: usage });
    }

    // Team-wide breakdown by user
    const usage = getTeamTokenUsage(startDate, endDate);
    return NextResponse.json({ data: usage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Token Usage] Error:', message);
    return NextResponse.json({ error: 'Failed to fetch token usage', details: message }, { status: 500 });
  }
}
