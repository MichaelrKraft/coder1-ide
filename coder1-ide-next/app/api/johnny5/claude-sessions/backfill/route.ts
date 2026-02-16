/**
 * Claude Code Session Backfill API
 *
 * POST /api/johnny5/claude-sessions/backfill
 *
 * Scans ~/.claude/projects/ for JSONL session files and indexes
 * conversation content into memory_chunks for Johnny5 session recall.
 *
 * Idempotent: already-indexed sessions are skipped via content_hash.
 */

import { NextResponse } from 'next/server';
import { indexAllClaudeSessions } from '@/services/memory/sources/claude-session-ingester';

let backfillInProgress = false;

export async function POST(request: Request) {
  if (backfillInProgress) {
    return NextResponse.json(
      { error: 'Backfill already in progress' },
      { status: 409 }
    );
  }

  backfillInProgress = true;

  try {
    // Parse optional limit from request body
    let limit = 100;
    try {
      const body = await request.json();
      if (body.limit && typeof body.limit === 'number') {
        limit = Math.min(body.limit, 500);
      }
    } catch {
      // No body or invalid JSON — use default limit
    }

    const result = await indexAllClaudeSessions('default', { limit });

    return NextResponse.json({
      success: true,
      sessionsProcessed: result.sessions,
      chunksIndexed: result.chunks,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[ClaudeSessions/Backfill] Fatal error:', error);
    return NextResponse.json(
      { error: 'Backfill failed' },
      { status: 500 }
    );
  } finally {
    backfillInProgress = false;
  }
}
