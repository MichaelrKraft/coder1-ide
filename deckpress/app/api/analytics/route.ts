import { NextRequest, NextResponse } from 'next/server';
import { recordOpenEvent, recordSectionTime } from '@/lib/kv';

/**
 * POST /api/analytics
 *
 * Two event types:
 * - `open`         → { type: 'open', token }
 *                   Fired once per deck load. Records a per-token open event.
 * - `section-time` → { type: 'section-time', sessionId, sectionIndex, seconds }
 *                   Fired when a scroll section leaves the viewport or on
 *                   beforeunload. Powers the dashboard time-on-section heatmap.
 */
export async function POST(request: NextRequest | Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { type, token, sessionId, sectionIndex, seconds } = (body ?? {}) as {
    type?: string;
    token?: string;
    sessionId?: string;
    sectionIndex?: number;
    seconds?: number;
  };

  if (type === 'open') {
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }
    const userAgent = request.headers.get('user-agent') ?? '';
    const referrer = request.headers.get('referer') ?? '';
    await recordOpenEvent(token, userAgent, referrer);
    return NextResponse.json({ ok: true });
  }

  if (type === 'section-time') {
    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      typeof sectionIndex !== 'number' ||
      typeof seconds !== 'number'
    ) {
      return NextResponse.json(
        { error: 'sessionId, sectionIndex, and seconds are required' },
        { status: 400 }
      );
    }
    await recordSectionTime(sessionId, sectionIndex, seconds);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown event type' }, { status: 400 });
}
