import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getTeachingSession, snapshotChat, updateTeachingSession } from '@/lib/agent-hub/teaching';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string; sessionId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
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

    if (session.status === 'converted') {
      return NextResponse.json({ error: 'Teaching session already converted' }, { status: 409 });
    }

    // Snapshot messages into chat_snapshot column
    const messageCount = snapshotChat(sessionId, userId);

    // Mark as converting — client will complete the SKILL.md generation
    const updated = updateTeachingSession(sessionId, userId, { status: 'converting' });

    return NextResponse.json({
      session: updated,
      chatSnapshot: updated?.chatSnapshot ?? [],
      messageCount,
    });
  } catch (error) {
    console.error('[agent-hub] POST /agents/[id]/teaching-sessions/[sessionId]/convert error:', error);
    return NextResponse.json({ error: 'Failed to start conversion' }, { status: 500 });
  }
}
