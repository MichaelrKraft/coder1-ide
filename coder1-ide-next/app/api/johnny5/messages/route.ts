import { NextRequest, NextResponse } from 'next/server';
import { getMessages, getDb } from '@/lib/johnny5-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let sessionId = searchParams.get('sessionId');

    // If no sessionId, get the most recent active session
    if (!sessionId) {
      const db = getDb();
      const stmt = db.prepare(`
        SELECT id FROM sessions
        WHERE status = 'active'
        ORDER BY started_at DESC
        LIMIT 1
      `);
      const row = stmt.get() as { id: string } | undefined;
      if (!row) {
        return NextResponse.json({ success: true, messages: [] });
      }
      sessionId = row.id;
    }

    const messages = await getMessages(sessionId, 500);
    return NextResponse.json({ success: true, messages, sessionId });
  } catch (error) {
    console.error('[Johnny5] Error loading messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}
