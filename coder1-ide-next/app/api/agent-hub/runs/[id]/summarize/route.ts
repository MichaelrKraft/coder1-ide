import { NextRequest, NextResponse } from 'next/server';
import { autoSummarize } from '@/lib/agent-hub/memory';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

/**
 * POST /api/agent-hub/runs/[id]/summarize
 * Trigger auto-summarization for a completed run
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: runId } = params;
    const userId = getAuthenticatedUserId(request);

    const db = getAgentHubDatabase();
    const run = db.prepare(
      `SELECT agent_id FROM agent_hub_runs WHERE id = ? AND user_id = ?`
    ).get(runId, userId) as { agent_id: string } | undefined;

    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Run not found' },
        { status: 404 }
      );
    }

    const result = await autoSummarize(runId, run.agent_id, userId);
    return NextResponse.json({ success: true, memory: result });
  } catch (error) {
    console.error('[Agent Hub] Summarize POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to summarize run',
      },
      { status: 500 }
    );
  }
}
