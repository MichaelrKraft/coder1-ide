/**
 * Johnny5 Sessions API
 *
 * GET /api/johnny5/sessions - List all sessions with pagination and filtering
 * POST /api/johnny5/sessions - Create a new session
 * DELETE /api/johnny5/sessions?id=xxx - Archive a session
 *
 * This endpoint uses the SQLite database via johnny5-db for persistent storage.
 * Database location: ~/.coder1/johnny5.db
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeDb,
  listSessions,
  createSession,
  archiveSession,
  type Session
} from '@/lib/johnny5-db';

// Force dynamic rendering - sessions data changes frequently
export const dynamic = 'force-dynamic';

/**
 * Convert database session to API session summary format
 */
function toSessionSummary(session: Session) {
  return {
    id: session.id,
    name: session.name || `Session ${session.started_at}`,
    startTime: new Date(session.started_at),
    endTime: session.ended_at ? new Date(session.ended_at) : undefined,
    status: session.status as 'active' | 'completed' | 'error',
    toolCalls: 0, // Not tracked in sessions table yet
    filesModified: [],
    tokensUsed: session.tokens_used,
    thinkingLevel: session.tokens_used > 100000 ? 'high' as const :
                   session.tokens_used > 30000 ? 'medium' as const : 'low' as const,
    messageCount: session.message_count,
    duration: session.ended_at
      ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
      : Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000),
  };
}

/**
 * GET /api/johnny5/sessions - List all sessions
 */
export async function GET(request: NextRequest) {
  try {
    await initializeDb();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status'); // 'active' | 'completed' | 'archived' | null (all)

    // Get sessions from database
    const sessions = await listSessions(limit + 100, offset); // Get extra for filtering

    // Filter by status if provided
    let filtered = status
      ? sessions.filter(s => s.status === status)
      : sessions;

    // Apply limit after filtering
    filtered = filtered.slice(0, limit);

    // Convert to API format
    const apiSessions = filtered.map(toSessionSummary);

    return NextResponse.json({
      success: true,
      data: {
        sessions: apiSessions,
        total: filtered.length,
        limit,
        offset
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Johnny5 Sessions API] Error listing sessions:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list sessions',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * POST /api/johnny5/sessions - Create new session
 */
export async function POST(request: NextRequest) {
  try {
    await initializeDb();

    const body = await request.json();
    const name = body.name || 'New Session';

    const session = await createSession(name);

    return NextResponse.json({
      success: true,
      data: { session: toSessionSummary(session) },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Johnny5 Sessions API] Error creating session:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * DELETE /api/johnny5/sessions?id=xxx - Archive a session
 */
export async function DELETE(request: NextRequest) {
  try {
    await initializeDb();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required (use ?id=xxx query parameter)',
        timestamp: new Date()
      }, { status: 400 });
    }

    await archiveSession(sessionId);

    return NextResponse.json({
      success: true,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Johnny5 Sessions API] Error archiving session:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive session',
      timestamp: new Date()
    }, { status: 500 });
  }
}
