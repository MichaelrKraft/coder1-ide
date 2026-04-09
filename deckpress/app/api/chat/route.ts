import { NextRequest, NextResponse } from 'next/server';
import { appendChatMessage } from '@/lib/kv';
import { sendTelegramMessage, formatInvestorMessage } from '@/lib/telegram';

/**
 * POST /api/chat
 *
 * An investor typed a message into the floating chat widget.
 * We store it in KV under chat:{sessionId}, then forward to Telegram
 * so the founder can reply with `/reply {sessionId} {text}`.
 *
 * sessionId format: `{token}-{random}` so we can derive the investor
 * label for display in Telegram without exposing the full session.
 */
export async function POST(request: NextRequest | Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { sessionId, message } = (body ?? {}) as {
    sessionId?: string;
    message?: string;
  };

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const truncated = message.slice(0, 500);
  const token = sessionId.split('-')[0] || sessionId.slice(0, 8);

  await appendChatMessage(sessionId, { role: 'investor', text: truncated });
  await sendTelegramMessage(formatInvestorMessage(sessionId, token, truncated));

  return NextResponse.json({ ok: true });
}
