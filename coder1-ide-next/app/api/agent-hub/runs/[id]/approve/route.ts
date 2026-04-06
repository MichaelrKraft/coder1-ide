import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getRun, updateRun } from '@/lib/agent-hub/runs';
import { getTask, updateTask } from '@/lib/agent-hub/tasks';
import { getAgent, getAgentRawTelegramToken } from '@/lib/agent-hub/agents';
import { sendAgentNotification } from '@/lib/agent-hub/telegram';
import { commitApprovedRun, mergeWorktreeBranch, removeWorktree } from '@/lib/agent-hub/git-tracker';

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
        if (run.worktreePath) {
          await mergeWorktreeBranch(agent.workspacePath, run.id, task.title);
        } else {
          await commitApprovedRun(agent.workspacePath, task.title, run.id);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        const isMergeConflict = errorMsg.includes('Merge conflict');
        // Mark run as failed on merge conflict or git error
        updateRun(id, userId, {
          status: 'failed',
          errorSummary: errorMsg.slice(0, 500),
          completedAt: new Date().toISOString(),
        });
        return NextResponse.json(
          { error: `Git operation failed: ${errorMsg}` },
          { status: isMergeConflict ? 409 : 500 }
        );
      }
    }

    // Mark approved BEFORE worktree cleanup (cleanup is best-effort)
    updateRun(id, userId, {
      status: 'approved',
      approvalStatus: 'approved',
      approvedBy: userId,
    });

    // Clean up worktree after approval — non-fatal if it fails
    if (run.worktreePath) {
      try {
        await removeWorktree(run.worktreePath);
      } catch (err) {
        console.warn(`[approve] Worktree cleanup failed (non-fatal): ${err instanceof Error ? err.message : err}`);
      }
    }

    if (task) {
      updateTask(run.taskId, userId, {
        status: 'done',
        completedAt: new Date().toISOString(),
      });
    }

    // Send per-agent Telegram notification if configured (best-effort)
    if (agent && task && agent.telegramChatId) {
      const rawToken = getAgentRawTelegramToken(agent.id, userId);
      if (rawToken) {
        sendAgentNotification(rawToken, agent.telegramChatId,
          `Task *${task.title}* has been approved and committed.`
        ).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/agent-hub/runs/[id]/approve] POST error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
