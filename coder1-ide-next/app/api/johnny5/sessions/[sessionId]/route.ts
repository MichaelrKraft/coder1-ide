/**
 * Johnny5 Session Detail API
 *
 * GET /api/johnny5/sessions/[sessionId] - Get single session with optional messages
 * PATCH /api/johnny5/sessions/[sessionId] - Update session (name, status)
 * DELETE /api/johnny5/sessions/[sessionId] - Archive session
 *
 * This endpoint uses the SQLite database via johnny5-db for persistent storage.
 * Database location: ~/.coder1/johnny5.db
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeDb,
  getSession,
  updateSession,
  getMessages,
  archiveSession,
  type Session,
  type Message
} from '@/lib/johnny5-db';
import { SessionTracker } from '@/services/johnny5/session-tracker';

// Force dynamic rendering - session data changes during active sessions
export const dynamic = 'force-dynamic';

/**
 * Convert database session to API session detail format
 */
function toSessionDetail(session: Session, messages: Message[] = []) {
  const startTime = new Date(session.started_at);
  const endTime = session.ended_at ? new Date(session.ended_at) : undefined;

  return {
    id: session.id,
    name: session.name || `Session ${session.started_at}`,
    startTime,
    endTime,
    status: session.status as 'active' | 'completed' | 'error',
    toolCalls: 0, // Will be calculated from messages with tool calls
    filesModified: [],
    tokensUsed: session.tokens_used,
    thinkingLevel: session.tokens_used > 100000 ? 'high' as const :
                   session.tokens_used > 30000 ? 'medium' as const : 'low' as const,
    messageCount: session.message_count,
    duration: endTime
      ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
      : Math.round((Date.now() - startTime.getTime()) / 60000),
    steps: messages.map((msg, index) => ({
      id: msg.id,
      timestamp: new Date(msg.created_at),
      type: msg.role === 'assistant' ? 'response' as const : 'thinking' as const,
      thinking: msg.role === 'user' ? msg.content : undefined,
      duration: 100, // Estimated
      outcome: 'success' as const
    })),
    fileChanges: [],
    errors: session.status === 'error' ? [{
      id: 'error_1',
      message: 'Session ended with error',
      timestamp: endTime || new Date(),
      resolved: false,
    }] : [],
    reasoning: messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n\n'),
  };
}

/**
 * Convert database message to API format
 */
function toAPIMessage(message: Message) {
  return {
    id: message.id,
    sessionId: message.session_id,
    role: message.role,
    content: message.content,
    tokens: message.tokens,
    createdAt: new Date(message.created_at)
  };
}

/**
 * GET /api/johnny5/sessions/[sessionId] - Get single session with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await initializeDb();

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: `Session not found: ${sessionId}`,
        timestamp: new Date()
      }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeMessages = searchParams.get('includeMessages') !== 'false';
    const messageLimit = parseInt(searchParams.get('messageLimit') || '100', 10);

    // Use SessionTracker service to get full session detail with metadata
    const sessionDetail = await SessionTracker.getSessionDetail(sessionId);

    let messages: Message[] = [];
    if (includeMessages) {
      messages = await getMessages(sessionId, messageLimit);
    }

    return NextResponse.json({
      success: true,
      data: {
        session: sessionDetail || toSessionDetail(session, messages),
        messages: messages.map(toAPIMessage)
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Johnny5 Session Detail API] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch session detail',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * PATCH /api/johnny5/sessions/[sessionId] - Update session
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await initializeDb();

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: `Session not found: ${sessionId}`,
        timestamp: new Date()
      }, { status: 404 });
    }

    const body = await request.json();

    // Only allow certain fields to be updated
    const allowedUpdates: Partial<Session> = {};
    if (body.name !== undefined) allowedUpdates.name = body.name;
    if (body.status !== undefined) allowedUpdates.status = body.status;

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update (allowed: name, status)',
        timestamp: new Date()
      }, { status: 400 });
    }

    await updateSession(sessionId, allowedUpdates);

    const updated = await getSession(sessionId);

    return NextResponse.json({
      success: true,
      data: { session: updated ? toSessionDetail(updated) : null },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Johnny5 Session Detail API] PATCH Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update session',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * DELETE /api/johnny5/sessions/[sessionId] - Archive session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await initializeDb();

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: `Session not found: ${sessionId}`,
        timestamp: new Date()
      }, { status: 404 });
    }

    await archiveSession(sessionId);

    return NextResponse.json({
      success: true,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Johnny5 Session Detail API] DELETE Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive session',
      timestamp: new Date()
    }, { status: 500 });
  }
}
