import { NextResponse } from 'next/server';
import { getOrCreateMainSession } from '@/lib/johnny5-db';

/**
 * GET /api/johnny5/session/main
 *
 * Returns the persistent "main" session ID that is shared between the IDE and Telegram.
 * Creates one if it doesn't exist yet. This ensures both channels use the same
 * conversation history so Johnny5 has continuous memory across contexts.
 */
export async function GET() {
  try {
    const sessionId = getOrCreateMainSession();
    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('[Johnny5] Failed to get main session:', error);
    return NextResponse.json({ error: 'Failed to get main session' }, { status: 500 });
  }
}
