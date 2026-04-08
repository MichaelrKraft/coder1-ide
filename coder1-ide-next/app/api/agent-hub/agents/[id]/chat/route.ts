import { NextRequest, NextResponse } from 'next/server';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getTeachingSession } from '@/lib/agent-hub/teaching';
import { v4 as uuidv4 } from 'uuid';

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
    const db = getAgentHubDatabase();
    const messages = db.prepare(
      `SELECT id, agent_id, user_id, session_id, role, content, created_at
       FROM agent_hub_chat_messages
       WHERE agent_id = ? AND user_id = ?
       ORDER BY created_at DESC LIMIT 50`
    ).all(agentId, userId);

    // Return in chronological order
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('[agent-hub] GET /agents/[id]/chat error:', error);
    return NextResponse.json({ error: 'Failed to get chat messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: agentId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { role, content, teaching_session_id } = body;
  if (typeof role !== 'string' || typeof content !== 'string') {
    return NextResponse.json({ error: 'role and content are required strings' }, { status: 400 });
  }

  if (role !== 'user' && role !== 'assistant') {
    return NextResponse.json({ error: 'role must be "user" or "assistant"' }, { status: 400 });
  }

  // Validate teaching_session_id ownership if provided
  if (teaching_session_id != null) {
    if (typeof teaching_session_id !== 'string') {
      return NextResponse.json({ error: 'teaching_session_id must be a string' }, { status: 400 });
    }
    const session = getTeachingSession(teaching_session_id, userId);
    if (!session || session.agentId !== agentId) {
      return NextResponse.json({ error: 'Invalid teaching_session_id' }, { status: 400 });
    }
  }

  try {
    const db = getAgentHubDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO agent_hub_chat_messages (id, agent_id, user_id, role, content, teaching_session_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, agentId, userId, role, content, teaching_session_id ?? null, now);

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('[agent-hub] POST /agents/[id]/chat error:', error);
    return NextResponse.json({ error: 'Failed to save chat message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: agentId } = await context.params;

  try {
    const db = getAgentHubDatabase();
    db.prepare(
      `DELETE FROM agent_hub_chat_messages WHERE agent_id = ? AND user_id = ?`
    ).run(agentId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] DELETE /agents/[id]/chat error:', error);
    return NextResponse.json({ error: 'Failed to clear chat messages' }, { status: 500 });
  }
}
