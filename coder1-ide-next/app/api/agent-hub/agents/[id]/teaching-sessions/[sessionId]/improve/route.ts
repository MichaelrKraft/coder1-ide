import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getTeachingSession, getTeachingSessionBySkillName } from '@/lib/agent-hub/teaching';

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { runId, skillName } = body;
  if (typeof skillName !== 'string') {
    return NextResponse.json({ error: 'skillName is required' }, { status: 400 });
  }

  try {
    // Get the current session for error context
    const currentSession = getTeachingSession(sessionId, userId);
    if (!currentSession || currentSession.agentId !== agentId) {
      return NextResponse.json({ error: 'Teaching session not found' }, { status: 404 });
    }

    // Find the original converted session for this skill (to get the original skill content)
    const originalSession = getTeachingSessionBySkillName(skillName, agentId, userId);

    return NextResponse.json({
      skillName,
      runId: runId ?? null,
      originalSkillMd: originalSession?.generatedSkillMd ?? null,
      chatSnapshot: currentSession.chatSnapshot,
      originalSessionId: originalSession?.id ?? null,
    });
  } catch (error) {
    console.error('[agent-hub] POST /agents/[id]/teaching-sessions/[sessionId]/improve error:', error);
    return NextResponse.json({ error: 'Failed to start improvement flow' }, { status: 500 });
  }
}
