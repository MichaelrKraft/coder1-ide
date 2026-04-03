import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getRun, updateRun } from '@/lib/agent-hub/runs';
import { getTask, updateTask } from '@/lib/agent-hub/tasks';
import { getAgent } from '@/lib/agent-hub/agents';
import { rejectRun } from '@/lib/agent-hub/git-tracker';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const run = getRun(id, userId);
    if (!run) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (run.status !== 'awaiting_approval') {
      return NextResponse.json(
        { error: `Run is not awaiting approval (status: ${run.status})` },
        { status: 409 }
      );
    }

    const task = getTask(run.taskId, userId);
    const agent = getAgent(run.agentId, userId);

    if (agent) {
      await rejectRun(agent.workspacePath);
    }

    updateRun(id, userId, {
      status: 'rejected',
      approvalStatus: 'rejected',
    });

    if (task) {
      updateTask(run.taskId, userId, { status: 'backlog' });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/agent-hub/runs/[id]/reject] POST error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
