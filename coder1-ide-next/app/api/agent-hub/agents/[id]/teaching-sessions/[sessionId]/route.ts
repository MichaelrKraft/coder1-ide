import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import {
  getTeachingSession,
  updateTeachingSession,
  completeTeachingSession,
  abandonTeachingSession,
} from '@/lib/agent-hub/teaching';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string; sessionId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: agentId, sessionId } = await context.params;

  try {
    const session = getTeachingSession(sessionId, userId);
    if (!session || session.agentId !== agentId) {
      return NextResponse.json({ error: 'Teaching session not found' }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (error) {
    console.error('[agent-hub] GET /agents/[id]/teaching-sessions/[sessionId] error:', error);
    return NextResponse.json({ error: 'Failed to get teaching session' }, { status: 500 });
  }
}

const VALID_STATUSES = ['active', 'paused', 'completed', 'abandoned', 'converting', 'converted'];

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: agentId, sessionId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    // Verify session belongs to this agent
    const existing = getTeachingSession(sessionId, userId);
    if (!existing || existing.agentId !== agentId) {
      return NextResponse.json({ error: 'Teaching session not found' }, { status: 404 });
    }

    const { title, status } = body;

    // Validate status if provided
    if (typeof status === 'string' && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    let session = null;

    if (status === 'completed') {
      session = completeTeachingSession(sessionId, userId);
    } else if (status === 'abandoned') {
      session = abandonTeachingSession(sessionId, userId);
    } else if (status === 'paused') {
      const now = new Date().toISOString();
      session = updateTeachingSession(sessionId, userId, { status: 'paused', pausedAt: now });
    } else {
      const input: Record<string, unknown> = {};
      if (typeof title === 'string') input.title = title;
      if (typeof status === 'string') input.status = status as 'active';
      session = updateTeachingSession(sessionId, userId, input);
    }

    if (!session) {
      return NextResponse.json({ error: 'Teaching session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('[agent-hub] PATCH /agents/[id]/teaching-sessions/[sessionId] error:', error);
    return NextResponse.json({ error: 'Failed to update teaching session' }, { status: 500 });
  }
}
