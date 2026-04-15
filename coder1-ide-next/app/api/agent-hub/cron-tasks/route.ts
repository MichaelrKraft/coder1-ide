import { NextRequest, NextResponse } from 'next/server';
import { listCronTasks, cancelCronTask } from '@/lib/agent-hub/db';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

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
