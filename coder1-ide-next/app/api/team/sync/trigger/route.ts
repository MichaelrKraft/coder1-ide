/**
 * POST /api/team/sync/trigger
 *
 * Manually triggers a sync cycle (push + pull).
 * Accepts { teamId } in the body. If the sync service isn't initialized yet,
 * it will auto-initialize using the authenticated user and supplied teamId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTeamSyncService } from '@/services/team-sync-service';
import { getAuthUser, requireTeamMember } from '@/lib/auth/team-middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json().catch(() => ({}));
    const { teamId } = body as { teamId?: string };

    const syncService = getTeamSyncService();

    // Auto-initialize if not connected yet and teamId provided
    if (!syncService.getStatus().isConnected && teamId) {
      await requireTeamMember(user.id, teamId);
      syncService.initialize(teamId, user.id, user.username);
    }

    await syncService.syncCycle();

    const status = syncService.getStatus();
    return NextResponse.json({
      ok: true,
      message: 'Sync cycle completed',
      status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('Not authenticated') ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
