import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getTask } from '@/lib/agent-hub/tasks';
import { createComment, listComments } from '@/lib/agent-hub/comments';

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
    const comments = listComments(id);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('[agent-hub] GET /tasks/[id]/comments error:', error);
    return NextResponse.json({ error: 'Failed to list comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
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

  if (typeof body.content !== 'string' || body.content.trim().length === 0) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  try {
    const task = getTask(id, userId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const comment = createComment(id, userId, body.content.trim());
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('[agent-hub] POST /tasks/[id]/comments error:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
