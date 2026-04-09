import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/kv', () => ({
  recordOpenEvent: vi.fn().mockResolvedValue(undefined),
  recordSectionTime: vi.fn().mockResolvedValue(undefined),
}));

import { recordOpenEvent, recordSectionTime } from '@/lib/kv';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/analytics', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('/api/analytics', () => {
  it('rejects unknown event type with 400', async () => {
    const { POST } = await import('@/app/api/analytics/route');
    const res = await POST(makeRequest({ type: 'bogus' }) as never);
    expect(res.status).toBe(400);
  });

  it('records open event when type=open with a token', async () => {
    const { POST } = await import('@/app/api/analytics/route');
    const res = await POST(
      makeRequest(
        { type: 'open', token: 'a16z' },
        { 'user-agent': 'Mozilla/TestUA', 'referer': 'https://origin.example' }
      ) as never
    );
    expect(res.status).toBe(200);
    expect(recordOpenEvent).toHaveBeenCalledWith('a16z', 'Mozilla/TestUA', 'https://origin.example');
  });

  it('rejects open event without token', async () => {
    const { POST } = await import('@/app/api/analytics/route');
    const res = await POST(makeRequest({ type: 'open' }) as never);
    expect(res.status).toBe(400);
    expect(recordOpenEvent).not.toHaveBeenCalled();
  });

  it('records section-time with numeric index and seconds', async () => {
    const { POST } = await import('@/app/api/analytics/route');
    const res = await POST(
      makeRequest({
        type: 'section-time',
        sessionId: 'sess1',
        sectionIndex: 3,
        seconds: 28,
      }) as never
    );
    expect(res.status).toBe(200);
    expect(recordSectionTime).toHaveBeenCalledWith('sess1', 3, 28);
  });

  it('rejects section-time with missing fields', async () => {
    const { POST } = await import('@/app/api/analytics/route');
    const res = await POST(
      makeRequest({ type: 'section-time', sessionId: 'sess1' }) as never
    );
    expect(res.status).toBe(400);
    expect(recordSectionTime).not.toHaveBeenCalled();
  });
});
