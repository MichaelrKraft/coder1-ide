import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/team-middleware';
import { getUserTeams } from '@/lib/auth';

/**
 * GET /api/team/mine
 * List all teams the authenticated user belongs to.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const teams = await getUserTeams(user.id);

    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
