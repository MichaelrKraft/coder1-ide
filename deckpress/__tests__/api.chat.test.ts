import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/kv', () => ({
  appendChatMessage: vi.fn().mockResolvedValue(undefined),
  getChatMessages: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
  formatInvestorMessage: vi.fn((sid: string, tok: string, msg: string) => `FMT:${sid}:${tok}:${msg}`),
  parseTelegramReply: vi.fn((text: string) => {
    const m = text.match(/^\/reply\s+(\S+)\s+(.+)$/);
    return m ? { sessionId: m[1], message: m[2] } : null;
  }),
}));

import { appendChatMessage, getChatMessages } from '@/lib/kv';
import { sendTelegramMessage } from '@/lib/telegram';

beforeEach(() => {
  vi.clearAllMocks();
});

function post(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/chat POST', () => {
  it('rejects without sessionId', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(post({ message: 'hi' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects without message', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(post({ sessionId: 'abc' }) as never);
    expect(res.status).toBe(400);
  });

  it('stores investor message and pings Telegram', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(post({ sessionId: 'a16z-xyz', message: 'What is your runway?' }) as never);
    expect(res.status).toBe(200);
    expect(appendChatMessage).toHaveBeenCalledWith('a16z-xyz', {
      role: 'investor',
      text: 'What is your runway?',
    });
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  it('truncates messages longer than 500 chars', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const long = 'x'.repeat(600);
    await POST(post({ sessionId: 's1', message: long }) as never);
    const call = vi.mocked(appendChatMessage).mock.calls[0];
    expect((call[1] as { text: string }).text.length).toBe(500);
  });
});

describe('/api/chat/messages GET', () => {
  function get(sessionId: string | null) {
    const url = sessionId
      ? `http://localhost/api/chat/messages?sessionId=${sessionId}`
      : 'http://localhost/api/chat/messages';
    return new Request(url);
  }

  it('rejects without sessionId query param', async () => {
    const { GET } = await import('@/app/api/chat/messages/route');
    const req = get(null);
    const res = await GET(Object.assign(req, { nextUrl: new URL(req.url) }) as never);
    expect(res.status).toBe(400);
  });

  it('returns messages for given sessionId', async () => {
    vi.mocked(getChatMessages).mockResolvedValueOnce([
      { role: 'investor', text: 'hello', ts: 1 },
    ]);
    const { GET } = await import('@/app/api/chat/messages/route');
    const req = get('s1');
    const res = await GET(Object.assign(req, { nextUrl: new URL(req.url) }) as never);
    const data = await res.json();
    expect(data.messages).toHaveLength(1);
    expect(getChatMessages).toHaveBeenCalledWith('s1');
  });
});

describe('/api/telegram webhook', () => {
  it('ignores non-/reply messages', async () => {
    const { POST } = await import('@/app/api/telegram/route');
    const req = new Request('http://localhost/api/telegram', {
      method: 'POST',
      body: JSON.stringify({ message: { text: 'random chatter' } }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(appendChatMessage).not.toHaveBeenCalled();
  });

  it('stores founder reply when text matches /reply pattern', async () => {
    const { POST } = await import('@/app/api/telegram/route');
    const req = new Request('http://localhost/api/telegram', {
      method: 'POST',
      body: JSON.stringify({ message: { text: '/reply sess123 We have 18 months runway' } }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(appendChatMessage).toHaveBeenCalledWith('sess123', {
      role: 'founder',
      text: 'We have 18 months runway',
    });
  });
});
