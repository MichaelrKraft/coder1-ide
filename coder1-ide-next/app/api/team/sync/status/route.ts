/**
 * GET /api/team/sync/status
 *
 * Returns the current team sync status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTeamSyncService } from '@/services/team-sync-service';
import { getAuthUser } from '@/lib/auth/team-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await getAuthUser(request);
    const syncService = getTeamSyncService();
    const status = syncService.getStatus();
    const summary = syncService.getNewKnowledgeSummary();

    return NextResponse.json({
      ok: true,
      status,
      recentKnowledge: summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
