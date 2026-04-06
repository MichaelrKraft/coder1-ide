import { NextRequest, NextResponse } from 'next/server';
import { createGoal, listGoals, type CreateGoalInput } from '@/lib/agent-hub/goals';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { checkSubscription } from '@/lib/agent-hub/paywall';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const subscription = await checkSubscription(userId);
  if (!subscription.isPaid) {
    return NextResponse.json(
      { error: 'Goals panel requires a paid plan' },
      { status: 402 }
    );
  }

  try {
    const goals = listGoals(userId);
    return NextResponse.json({ goals });
  } catch (error) {
    console.error('[agent-hub] GET /goals error:', error);
    return NextResponse.json({ error: 'Failed to list goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const subscription = await checkSubscription(userId);
  if (!subscription.isPaid) {
    return NextResponse.json(
      { error: 'Goals panel requires a paid plan' },
      { status: 402 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title } = body;
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const input: CreateGoalInput = {
    userId,
    title,
    description: typeof body.description === 'string' ? body.description : '',
    ownerId: typeof body.ownerId === 'string' ? body.ownerId : userId,
    status:
      typeof body.status === 'string' &&
      ['active', 'completed', 'paused', 'abandoned'].includes(body.status)
        ? (body.status as CreateGoalInput['status'])
        : 'active',
    dueDate: typeof body.dueDate === 'string' ? body.dueDate : undefined,
    taskIds: Array.isArray(body.taskIds)
      ? body.taskIds.filter((t: unknown): t is string => typeof t === 'string')
      : [],
    progressPercent: typeof body.progressPercent === 'number' ? Math.max(0, Math.min(100, body.progressPercent)) : 0,
  };

  try {
    const goal = createGoal(input);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('[agent-hub] POST /goals error:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
