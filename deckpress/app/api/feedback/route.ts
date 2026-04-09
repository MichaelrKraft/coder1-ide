import { NextRequest, NextResponse } from 'next/server';
import { appendFeedback } from '@/lib/kv';
import { sendTelegramMessage } from '@/lib/telegram';

/**
 * POST /api/feedback
 *
 * End-of-deck feedback from an investor who isn't a fit.
 * Stored under the `feedback` list in KV and mirrored to the
 * founder via Telegram so no feedback ever slips past unnoticed.
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

  const truncated = message.slice(0, 1000);
  await appendFeedback(sessionId, truncated);
  await sendTelegramMessage(
    `📝 *Deckpress feedback* from \`${sessionId}\`:\n\n"${truncated}"`
  );

  return NextResponse.json({ ok: true });
}
