import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask, cancelTask, type UpdateTaskInput } from '@/lib/agent-hub/tasks';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const task = getTask(id, userId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    console.error('[agent-hub] GET /tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to get task' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const allowedPriorities = ['low', 'medium', 'high'];
  const allowedStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

  const input: UpdateTaskInput = {};

  if (typeof body.title === 'string') input.title = body.title;
  if (typeof body.description === 'string') input.description = body.description;
  if (typeof body.githubIssueUrl === 'string') input.githubIssueUrl = body.githubIssueUrl;
  if (typeof body.priority === 'string' && allowedPriorities.includes(body.priority)) {
    input.priority = body.priority as UpdateTaskInput['priority'];
  }
  if (typeof body.status === 'string' && allowedStatuses.includes(body.status)) {
    input.status = body.status as UpdateTaskInput['status'];
  }
  if (typeof body.agentId === 'string') input.agentId = body.agentId;

  try {
    const task = updateTask(id, userId, input);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    console.error('[agent-hub] PATCH /tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const cancelled = cancelTask(id, userId);
    if (!cancelled) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] DELETE /tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to cancel task' }, { status: 500 });
  }
}
