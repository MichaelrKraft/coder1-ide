import { NextRequest, NextResponse } from 'next/server';
import { getGoal, updateGoal, deleteGoal, type UpdateGoalInput } from '@/lib/agent-hub/goals';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { checkSubscription } from '@/lib/agent-hub/paywall';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const subscription = await checkSubscription(userId);
  if (!subscription.isPaid) {
    return NextResponse.json({ error: 'Goals panel requires a paid plan' }, { status: 402 });
  }

  try {
    const goal = getGoal(params.id, userId);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json({ goal });
  } catch (error) {
    console.error('[agent-hub] GET /goals/[id] error:', error);
    return NextResponse.json({ error: 'Failed to get goal' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const subscription = await checkSubscription(userId);
  if (!subscription.isPaid) {
    return NextResponse.json({ error: 'Goals panel requires a paid plan' }, { status: 402 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: UpdateGoalInput = {};
  if (typeof body.title === 'string') updates.title = body.title;
  if (typeof body.description === 'string') updates.description = body.description;
  if (typeof body.ownerId === 'string') updates.ownerId = body.ownerId;
  if (
    typeof body.status === 'string' &&
    ['active', 'completed', 'paused', 'abandoned'].includes(body.status)
  ) {
    updates.status = body.status as UpdateGoalInput['status'];
  }
  if (typeof body.dueDate === 'string') updates.dueDate = body.dueDate;
  if (typeof body.progressPercent === 'number') updates.progressPercent = Math.max(0, Math.min(100, body.progressPercent));
  if (Array.isArray(body.taskIds)) {
    updates.taskIds = body.taskIds.filter((t: unknown): t is string => typeof t === 'string');
  }

  try {
    const goal = updateGoal(params.id, userId, updates);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json({ goal });
  } catch (error) {
    console.error('[agent-hub] PATCH /goals/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const subscription = await checkSubscription(userId);
  if (!subscription.isPaid) {
    return NextResponse.json({ error: 'Goals panel requires a paid plan' }, { status: 402 });
  }

  try {
    const existing = getGoal(params.id, userId);
    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    deleteGoal(params.id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] DELETE /goals/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
