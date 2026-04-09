import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages } from '@/lib/kv';

/**
 * GET /api/chat/messages?sessionId={id}
 *
 * Polled every 2 seconds by the investor's chat widget to pick up
 * any new founder replies. Returns the full conversation history
 * (capped at 100 messages) in chronological order.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  const messages = await getChatMessages(sessionId);
  return NextResponse.json({ messages });
}
