import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { listRuns, listRunsForTask, listRunsForAgent } from '@/lib/agent-hub/runs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const agentId = searchParams.get('agentId');

  try {
    if (taskId) {
      return NextResponse.json(listRunsForTask(taskId, userId));
    }
    if (agentId) {
      return NextResponse.json(listRunsForAgent(agentId, userId));
    }
    return NextResponse.json(listRuns(userId));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/agent-hub/runs] GET error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
