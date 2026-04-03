import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getRun, updateRun } from '@/lib/agent-hub/runs';
import { getTask, updateTask } from '@/lib/agent-hub/tasks';
import { getAgent } from '@/lib/agent-hub/agents';
import { commitApprovedRun } from '@/lib/agent-hub/git-tracker';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
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

    if (task && agent) {
      try {
        await commitApprovedRun(agent.workspacePath, task.title, run.id);
      } catch (err) {
        return NextResponse.json(
          { error: `Git commit failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    updateRun(id, userId, {
      status: 'approved',
      approvalStatus: 'approved',
      approvedBy: userId,
    });

    if (task) {
      updateTask(run.taskId, userId, {
        status: 'done',
        completedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/agent-hub/runs/[id]/approve] POST error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
