import { NextRequest, NextResponse } from 'next/server';
import { listCronTasks, cancelCronTask, insertCronTask, updateCronTaskNextRun } from '@/lib/agent-hub/db';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { Cron } from 'croner';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const agentId = request.nextUrl.searchParams.get('agentId');
  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }

  try {
    const tasks = listCronTasks(agentId, userId);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[agent-hub] GET /cron-tasks error:', error);
    return NextResponse.json({ error: 'Failed to list cron tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentId, runId, schedule, prompt, expiresAt } = body;

  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }
  if (!runId || typeof runId !== 'string') {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }
  if (!schedule || typeof schedule !== 'string') {
    return NextResponse.json({ error: 'schedule is required' }, { status: 400 });
  }
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  // Validate cron expression before persisting
  try {
    new Cron(schedule);
  } catch {
    return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
  }

  try {
    const taskId = randomUUID();
    insertCronTask({
      id: taskId,
      userId,
      agentId,
      runId,
      schedule,
      prompt,
      expiresAt: typeof expiresAt === 'string' ? expiresAt : null,
    });

    // Set next_run_at immediately so the scheduler can pick it up
    const next = new Cron(schedule).nextRun();
    if (next) {
      updateCronTaskNextRun(taskId, next.toISOString().replace('T', ' ').replace('Z', ''));
    }

    return NextResponse.json({ taskId }, { status: 201 });
  } catch (error) {
    console.error('[agent-hub] POST /cron-tasks error:', error);
    return NextResponse.json({ error: 'Failed to create cron task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const taskId = request.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  try {
    cancelCronTask(taskId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] DELETE /cron-tasks error:', error);
    return NextResponse.json({ error: 'Failed to cancel cron task' }, { status: 500 });
  }
}
