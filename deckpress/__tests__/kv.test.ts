import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @vercel/kv before importing lib/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    lpush: vi.fn(),
    lrange: vi.fn(),
    keys: vi.fn(),
  },
}));

import { kv } from '@vercel/kv';
import {
  recordOpenEvent,
  recordSectionTime,
  appendChatMessage,
  getChatMessages,
  appendFeedback,
  getAllFeedback,
  getAllOpenTokens,
  getOpensForToken,
} from '@/lib/kv';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordOpenEvent', () => {
  it('stores under open:{token} key with timestamp', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await recordOpenEvent('a16z', 'Mozilla/5.0', 'https://example.com');
    expect(kv.lpush).toHaveBeenCalledTimes(1);
    expect(kv.lpush).toHaveBeenCalledWith(
      'open:a16z',
      expect.objectContaining({
        token: 'a16z',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://example.com',
        openedAt: expect.any(Number),
      })
    );
  });
});

describe('recordSectionTime', () => {
  it('stores section time under section-time:{sessionId}', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await recordSectionTime('sess1', 2, 45);
    expect(kv.lpush).toHaveBeenCalledWith(
      'section-time:sess1',
      expect.objectContaining({
        sectionIndex: 2,
        seconds: 45,
        ts: expect.any(Number),
      })
    );
  });
});

describe('appendChatMessage', () => {
  it('stores message under chat:{sessionId} with ts', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await appendChatMessage('sess1', { role: 'investor', text: 'Hello?' });
    expect(kv.lpush).toHaveBeenCalledWith(
      'chat:sess1',
      expect.objectContaining({
        role: 'investor',
        text: 'Hello?',
        ts: expect.any(Number),
      })
    );
  });
});

describe('getChatMessages', () => {
  it('returns messages sorted chronologically (oldest first)', async () => {
    vi.mocked(kv.lrange).mockResolvedValue([
      { role: 'founder', text: 'A', ts: 2000 },
      { role: 'investor', text: 'Q', ts: 1000 },
    ]);
    const msgs = await getChatMessages('sess1');
    expect(msgs).toHaveLength(2);
    expect(msgs[0].ts).toBe(1000);
    expect(msgs[0].text).toBe('Q');
    expect(msgs[1].ts).toBe(2000);
    expect(msgs[1].text).toBe('A');
  });

  it('returns empty array when no messages', async () => {
    vi.mocked(kv.lrange).mockResolvedValue([]);
    const msgs = await getChatMessages('empty');
    expect(msgs).toEqual([]);
  });
});

describe('appendFeedback + getAllFeedback', () => {
  it('stores feedback in feedback list', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await appendFeedback('sess1', 'Great deck');
    expect(kv.lpush).toHaveBeenCalledWith(
      'feedback',
      expect.objectContaining({
        sessionId: 'sess1',
        message: 'Great deck',
        ts: expect.any(Number),
      })
    );
  });

  it('retrieves feedback sorted by newest first', async () => {
    vi.mocked(kv.lrange).mockResolvedValue([
      { sessionId: 's1', message: 'old', ts: 1000 },
      { sessionId: 's2', message: 'new', ts: 2000 },
    ]);
    const feedback = await getAllFeedback();
    expect(feedback).toHaveLength(2);
    expect(feedback[0].ts).toBe(2000);
    expect(feedback[0].message).toBe('new');
  });
});

describe('getAllOpenTokens', () => {
  it('strips open: prefix from keys', async () => {
    vi.mocked(kv.keys).mockResolvedValue(['open:a16z', 'open:sequoia', 'open:tiger']);
    const tokens = await getAllOpenTokens();
    expect(tokens).toEqual(['a16z', 'sequoia', 'tiger']);
  });

  it('returns empty array when no opens', async () => {
    vi.mocked(kv.keys).mockResolvedValue([]);
    expect(await getAllOpenTokens()).toEqual([]);
  });
});

describe('getOpensForToken', () => {
  it('fetches open events for a specific token', async () => {
    const events = [
      { token: 'a16z', openedAt: 2000, userAgent: '', referrer: '' },
      { token: 'a16z', openedAt: 1000, userAgent: '', referrer: '' },
    ];
    vi.mocked(kv.lrange).mockResolvedValue(events);
    const result = await getOpensForToken('a16z');
    expect(kv.lrange).toHaveBeenCalledWith('open:a16z', 0, 49);
    expect(result).toEqual(events);
  });
});
