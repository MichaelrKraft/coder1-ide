import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/kv', () => ({
  appendFeedback: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}));

import { appendFeedback } from '@/lib/kv';
import { sendTelegramMessage } from '@/lib/telegram';

beforeEach(() => {
  vi.clearAllMocks();
});

function post(body: unknown) {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/feedback', () => {
  it('rejects without sessionId', async () => {
    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(post({ message: 'nope' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects without message', async () => {
    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(post({ sessionId: 's1' }) as never);
    expect(res.status).toBe(400);
  });

  it('stores feedback and pings Telegram', async () => {
    const { POST } = await import('@/app/api/feedback/route');
    const res = await POST(post({ sessionId: 's1', message: 'Too early for us.' }) as never);
    expect(res.status).toBe(200);
    expect(appendFeedback).toHaveBeenCalledWith('s1', 'Too early for us.');
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  it('truncates feedback longer than 1000 chars', async () => {
    const { POST } = await import('@/app/api/feedback/route');
    const long = 'x'.repeat(1200);
    await POST(post({ sessionId: 's1', message: long }) as never);
    const call = vi.mocked(appendFeedback).mock.calls[0];
    expect((call[1] as string).length).toBe(1000);
  });
});
