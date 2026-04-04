import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const db = getAgentHubDatabase();
    const row = db.prepare(`
      SELECT
        COUNT(CASE WHEN turn = 'user' AND status = 'active' THEN 1 END) as your_turn,
        COUNT(CASE WHEN turn = 'claude' AND status = 'active' THEN 1 END) as claude_turn,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as total
      FROM agent_hub_goals WHERE user_id = ?
    `).get(userId) as { your_turn: number; claude_turn: number; total: number } | undefined;

    return NextResponse.json({
      yourTurn: row?.your_turn ?? 0,
      claudeTurn: row?.claude_turn ?? 0,
      total: row?.total ?? 0,
    });
  } catch (error) {
    console.error('[agent-hub] GET /goals/counts error:', error);
    return NextResponse.json({ error: 'Failed to fetch goal counts' }, { status: 500 });
  }
}
