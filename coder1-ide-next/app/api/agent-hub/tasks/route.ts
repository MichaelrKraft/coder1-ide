import { NextRequest, NextResponse } from 'next/server';
import { createTask, listTasks, listTasksByAgent } from '@/lib/agent-hub/tasks';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { autoAssignTask } from '@/lib/agent-hub/auto-assign';
import { FLAGS } from '@/lib/agent-hub/feature-flags';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const agentId = request.nextUrl.searchParams.get('agentId');

  try {
    const tasks = agentId
      ? listTasksByAgent(agentId, userId)
      : listTasks(userId);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[agent-hub] GET /tasks error:', error);
    return NextResponse.json({ error: 'Failed to list tasks' }, { status: 500 });
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

  const { title, agentId } = body;

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  // Auto-assign if agentId is 'auto' or not provided
  let resolvedAgentId = typeof agentId === 'string' ? agentId : undefined;
  if (!resolvedAgentId || resolvedAgentId === 'auto') {
    if (!FLAGS.autoAssignEnabled) {
      return NextResponse.json(
        { error: 'agentId is required (auto-assign is disabled)' },
        { status: 400 }
      );
    }
    const assignment = await autoAssignTask(
      typeof body.title === 'string' ? body.title : '',
      typeof body.description === 'string' ? body.description : '',
      userId
    );
    if (!assignment.agentId) {
      return NextResponse.json({ error: 'No agents available for auto-assign' }, { status: 400 });
    }
    resolvedAgentId = assignment.agentId;
  }

  const allowedPriorities = ['low', 'medium', 'high'];
  const priority = typeof body.priority === 'string' && allowedPriorities.includes(body.priority)
    ? (body.priority as 'low' | 'medium' | 'high')
    : 'medium';

  try {
    const task = createTask({
      userId,
      agentId: resolvedAgentId,
      title,
      description: typeof body.description === 'string' ? body.description : undefined,
      githubIssueUrl: typeof body.githubIssueUrl === 'string' ? body.githubIssueUrl : undefined,
      priority,
      parentTaskId: typeof body.parentTaskId === 'string' ? body.parentTaskId : undefined,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('[agent-hub] POST /tasks error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
