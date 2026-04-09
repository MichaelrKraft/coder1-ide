import { NextRequest, NextResponse } from 'next/server';
import { appendChatMessage } from '@/lib/kv';
import { parseTelegramReply } from '@/lib/telegram';

/**
 * POST /api/telegram
 *
 * Telegram webhook endpoint. Telegram POSTs an update here every
 * time the founder sends a message to the bot. We only care about
 * messages matching the `/reply {sessionId} {text}` pattern —
 * anything else is ignored silently (we return 200 so Telegram
 * doesn't keep retrying).
 *
 * When a valid reply is parsed, we store it under the corresponding
 * chat:{sessionId} list so the investor's polling widget picks it up.
 */
export async function POST(request: NextRequest | Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const text = (body as { message?: { text?: string } })?.message?.text ?? '';
  const parsed = parseTelegramReply(text);
  if (!parsed) {
    return NextResponse.json({ ok: true });
  }

  await appendChatMessage(parsed.sessionId, {
    role: 'founder',
    text: parsed.message.slice(0, 500),
  });

  return NextResponse.json({ ok: true });
}
