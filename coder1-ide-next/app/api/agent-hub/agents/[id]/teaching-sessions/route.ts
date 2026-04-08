import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import {
  listTeachingSessions,
  createTeachingSession,
  getActiveTeachingSession,
} from '@/lib/agent-hub/teaching';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: agentId } = await context.params;

  try {
    const sessions = listTeachingSessions(agentId, userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[agent-hub] GET /agents/[id]/teaching-sessions error:', error);
    return NextResponse.json({ error: 'Failed to list teaching sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: agentId } = await context.params;

  try {
    const existing = getActiveTeachingSession(agentId, userId);
    if (existing) {
      return NextResponse.json(
        { error: 'An active teaching session already exists for this agent', session: existing },
        { status: 409 }
      );
    }

    const session = createTeachingSession(agentId, userId);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('[agent-hub] POST /agents/[id]/teaching-sessions error:', error);
    return NextResponse.json({ error: 'Failed to create teaching session' }, { status: 500 });
  }
}
