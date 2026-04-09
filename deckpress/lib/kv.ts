import { kv } from '@vercel/kv';

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
  const event: OpenEvent = {
    token,
    openedAt: Date.now(),
    userAgent,
    referrer,
  };
  await kv.lpush(`open:${token}`, event);
}

export async function recordSectionTime(
  sessionId: string,
  sectionIndex: number,
  seconds: number
): Promise<void> {
  const event: SectionTimeEvent = {
    sectionIndex,
    seconds,
    ts: Date.now(),
  };
  await kv.lpush(`section-time:${sessionId}`, event);
}

export async function appendChatMessage(
  sessionId: string,
  message: Pick<ChatMessage, 'role' | 'text'>
): Promise<void> {
  const full: ChatMessage = { ...message, ts: Date.now() };
  await kv.lpush(`chat:${sessionId}`, full);
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const msgs = await kv.lrange<ChatMessage>(`chat:${sessionId}`, 0, 99);
  return [...msgs].sort((a, b) => a.ts - b.ts);
}

export async function appendFeedback(
  sessionId: string,
  message: string
): Promise<void> {
  const entry: FeedbackEntry = { sessionId, message, ts: Date.now() };
  await kv.lpush('feedback', entry);
}

export async function getAllFeedback(): Promise<FeedbackEntry[]> {
  const items = await kv.lrange<FeedbackEntry>('feedback', 0, 99);
  return [...items].sort((a, b) => b.ts - a.ts);
}

export async function getAllOpenTokens(): Promise<string[]> {
  const keys = await kv.keys('open:*');
  return keys.map((k) => k.replace('open:', ''));
}

export async function getOpensForToken(token: string): Promise<OpenEvent[]> {
  return kv.lrange<OpenEvent>(`open:${token}`, 0, 49);
}
