import { kv } from '@vercel/kv';

// When KV env vars are absent (local dev), fall back to in-memory store
// to prevent unhandled exceptions flooding the terminal on every poll
const KV_CONFIGURED =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

const memStore = new Map<string, unknown[]>();

function memLpush(key: string, val: unknown): void {
  const list = memStore.get(key) ?? [];
  list.unshift(val);
  memStore.set(key, list);
}

function memLrange<T>(key: string, start: number, end: number): T[] {
  const list = (memStore.get(key) as T[]) ?? [];
  const stop = end < 0 ? undefined : end + 1;
  return list.slice(start, stop);
}

export interface OpenEvent {
  token: string;
  openedAt: number;
  userAgent: string;
  referrer: string;
}

export interface SectionTimeEvent {
  sectionIndex: number;
  seconds: number;
  ts: number;
}

export interface ChatMessage {
  role: 'investor' | 'founder';
  text: string;
  ts: number;
}

export interface FeedbackEntry {
  sessionId: string;
  message: string;
  ts: number;
}

export async function recordOpenEvent(
  token: string,
  userAgent: string,
  referrer: string
): Promise<void> {
  const event: OpenEvent = { token, openedAt: Date.now(), userAgent, referrer };
  if (KV_CONFIGURED) {
    await kv.lpush(`open:${token}`, event);
  } else {
    memLpush(`open:${token}`, event);
  }
}

export async function recordSectionTime(
  sessionId: string,
  sectionIndex: number,
  seconds: number
): Promise<void> {
  const event: SectionTimeEvent = { sectionIndex, seconds, ts: Date.now() };
  if (KV_CONFIGURED) {
    await kv.lpush(`section-time:${sessionId}`, event);
  } else {
    memLpush(`section-time:${sessionId}`, event);
  }
}

export async function appendChatMessage(
  sessionId: string,
  message: Pick<ChatMessage, 'role' | 'text'>
): Promise<void> {
  const full: ChatMessage = { ...message, ts: Date.now() };
  if (KV_CONFIGURED) {
    await kv.lpush(`chat:${sessionId}`, full);
  } else {
    memLpush(`chat:${sessionId}`, full);
  }
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const msgs = KV_CONFIGURED
    ? await kv.lrange<ChatMessage>(`chat:${sessionId}`, 0, 99)
    : memLrange<ChatMessage>(`chat:${sessionId}`, 0, 99);
  return [...msgs].sort((a, b) => a.ts - b.ts);
}

export async function appendFeedback(sessionId: string, message: string): Promise<void> {
  const entry: FeedbackEntry = { sessionId, message, ts: Date.now() };
  if (KV_CONFIGURED) {
    await kv.lpush('feedback', entry);
  } else {
    memLpush('feedback', entry);
  }
}

export async function getAllFeedback(): Promise<FeedbackEntry[]> {
  const items = KV_CONFIGURED
    ? await kv.lrange<FeedbackEntry>('feedback', 0, 99)
    : memLrange<FeedbackEntry>('feedback', 0, 99);
  return [...items].sort((a, b) => b.ts - a.ts);
}

export async function getAllOpenTokens(): Promise<string[]> {
  if (KV_CONFIGURED) {
    const keys = await kv.keys('open:*');
    return keys.map((k) => k.replace('open:', ''));
  }
  return Array.from(memStore.keys())
    .filter((k) => k.startsWith('open:'))
    .map((k) => k.replace('open:', ''));
}

export async function getOpensForToken(token: string): Promise<OpenEvent[]> {
  return KV_CONFIGURED
    ? kv.lrange<OpenEvent>(`open:${token}`, 0, 49)
    : memLrange<OpenEvent>(`open:${token}`, 0, 49);
}
