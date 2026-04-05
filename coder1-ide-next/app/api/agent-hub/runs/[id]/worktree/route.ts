import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getRun, updateRun } from '@/lib/agent-hub/runs';
import { getTask } from '@/lib/agent-hub/tasks';
import { getAgent } from '@/lib/agent-hub/agents';
import {
  getDiffForWorkspace,
  getChangedFiles,
  mergeWorktreeBranch,
  removeWorktree,
} from '@/lib/agent-hub/git-tracker';
import fs from 'fs';

/**
 * GET /api/agent-hub/runs/[id]/worktree
 * Returns worktree status and diff summary for a run.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const run = getRun(id, userId);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  if (!run.worktreePath) {
    return NextResponse.json({ error: 'Run has no worktree' }, { status: 404 });
  }

  if (!fs.existsSync(run.worktreePath)) {
    return NextResponse.json({ error: 'Worktree directory not found' }, { status: 404 });
  }

  try {
    const changedFiles = await getChangedFiles(run.worktreePath);
    const diff = await getDiffForWorkspace(run.worktreePath);

    // Parse diff stats
    const lines = diff.split('\n');
    let insertions = 0;
    let deletions = 0;
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) insertions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    return NextResponse.json({
      worktreePath: run.worktreePath,
      branch: `agent/run-${id}`,
      filesChanged: changedFiles.length,
      files: changedFiles,
      insertions,
      deletions,
      diff,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read worktree';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/agent-hub/runs/[id]/worktree
 * Perform merge, discard, or keep on a run's worktree.
 * Body: { action: 'merge' | 'discard' | 'keep' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const run = getRun(id, userId);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  if (!run.worktreePath) {
    return NextResponse.json({ error: 'Run has no worktree' }, { status: 404 });
  }

  const body = await request.json() as { action: string };
  const { action } = body;

  if (!action || !['merge', 'discard', 'keep'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be merge, discard, or keep' },
      { status: 400 }
    );
  }

  try {
    if (action === 'keep') {
      return NextResponse.json({ success: true, message: 'Worktree kept as-is' });
    }

    if (action === 'discard') {
      await removeWorktree(run.worktreePath);
      await updateRun(id, userId, { worktreePath: null });
      return NextResponse.json({ success: true, message: 'Worktree discarded' });
    }

    // action === 'merge'
    const agent = getAgent(run.agentId, userId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const task = getTask(run.taskId, userId);
    const taskTitle = task?.title ?? 'Untitled task';

    await mergeWorktreeBranch(agent.workspacePath, id, taskTitle);
    await removeWorktree(run.worktreePath);
    await updateRun(id, userId, { worktreePath: null });

    return NextResponse.json({ success: true, message: 'Changes merged and worktree cleaned up' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Worktree operation failed';

    if (message.includes('Merge conflict')) {
      return NextResponse.json({ success: false, conflict: true, message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
