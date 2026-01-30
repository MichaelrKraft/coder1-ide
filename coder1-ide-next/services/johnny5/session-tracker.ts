/**
 * Johnny5 Session Tracker Service
 *
 * Tracks and persists session data for real session intelligence.
 * Works with Moltbot sessions and direct Claude API sessions.
 */

import fs from 'fs';
import path from 'path';
import type { Johnny5SessionSummary, Johnny5SessionDetail, Johnny5ReplayStep } from '@/types/johnny5';

// Storage path
const DATA_DIR = path.join(process.cwd(), 'data', 'johnny5');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// In-memory cache
interface SessionRecord {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'error';
  toolCalls: number;
  filesModified: string[];
  tokensUsed: number;
  thinkingLevel: 'low' | 'medium' | 'high';
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    tokens?: number;
  }>;
  steps: Johnny5ReplayStep[];
  source: 'moltbot' | 'direct' | 'mock' | 'fallback';
}

let sessionsCache: SessionRecord[] = [];
let cacheLoaded = false;

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load sessions from file
 */
function loadSessions(): SessionRecord[] {
  if (cacheLoaded) {
    return sessionsCache;
  }

  ensureDataDir();

  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      sessionsCache = parsed.map((session: SessionRecord) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined,
        messages: session.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
        steps: session.steps.map(s => ({
          ...s,
          timestamp: new Date(s.timestamp),
        })),
      }));
    } catch (error) {
      console.error('[SessionTracker] Failed to load sessions:', error);
      sessionsCache = [];
    }
  } else {
    sessionsCache = [];
  }

  cacheLoaded = true;
  return sessionsCache;
}

/**
 * Save sessions to file
 */
function saveSessions(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsCache, null, 2));
  } catch (error) {
    console.error('[SessionTracker] Failed to save sessions:', error);
  }
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start or get an existing session
 */
export function getOrCreateSession(sessionId: string, source: 'moltbot' | 'direct' | 'mock' | 'fallback'): SessionRecord {
  loadSessions();

  let session = sessionsCache.find(s => s.id === sessionId);

  if (!session) {
    session = {
      id: sessionId,
      name: `Session ${new Date().toLocaleString()}`,
      startTime: new Date(),
      status: 'active',
      toolCalls: 0,
      filesModified: [],
      tokensUsed: 0,
      thinkingLevel: 'low',
      messages: [],
      steps: [],
      source,
    };
    sessionsCache.push(session);
    setImmediate(() => saveSessions());
  }

  return session;
}

/**
 * Add a message to a session
 */
export function addMessageToSession(params: {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  source: 'moltbot' | 'direct' | 'mock' | 'fallback';
  toolCalls?: Array<{ name: string; input?: unknown; output?: unknown }>;
  thinking?: string;
}): void {
  const session = getOrCreateSession(params.sessionId, params.source);

  // Add message
  session.messages.push({
    role: params.role,
    content: params.content,
    timestamp: new Date(),
    tokens: params.role === 'assistant' ? params.outputTokens : params.inputTokens,
  });

  // Update token count
  if (params.inputTokens) session.tokensUsed += params.inputTokens;
  if (params.outputTokens) session.tokensUsed += params.outputTokens;

  // Add replay steps for tool calls
  if (params.toolCalls) {
    session.toolCalls += params.toolCalls.length;

    for (const tc of params.toolCalls) {
      session.steps.push({
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        type: 'tool_call',
        toolName: tc.name,
        toolInput: tc.input as Record<string, unknown>,
        toolOutput: tc.output as Record<string, unknown>,
        duration: 100, // Estimated
        outcome: 'success',
      });

      // Track file modifications
      if (tc.name === 'Write' || tc.name === 'Edit') {
        const filePath = (tc.input as { file_path?: string })?.file_path;
        if (filePath && !session.filesModified.includes(filePath)) {
          session.filesModified.push(filePath);
        }
      }
    }
  }

  // Add thinking step if present
  if (params.thinking) {
    session.steps.push({
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      type: 'thinking',
      thinking: params.thinking,
      duration: 500, // Estimated
      outcome: 'success',
    });
  }

  // Update thinking level based on total tokens
  if (session.tokensUsed > 100000) {
    session.thinkingLevel = 'high';
  } else if (session.tokensUsed > 30000) {
    session.thinkingLevel = 'medium';
  }

  // Update name based on first user message
  if (session.messages.filter(m => m.role === 'user').length === 1 && params.role === 'user') {
    // Use first 50 chars of first user message as session name
    session.name = params.content.substring(0, 50) + (params.content.length > 50 ? '...' : '');
  }

  setImmediate(() => saveSessions());
}

/**
 * Complete a session
 */
export function completeSession(sessionId: string, status: 'completed' | 'error' = 'completed'): void {
  loadSessions();

  const session = sessionsCache.find(s => s.id === sessionId);
  if (session) {
    session.status = status;
    session.endTime = new Date();
    setImmediate(() => saveSessions());
  }
}

/**
 * Get session summaries
 */
export function getSessionSummaries(params: {
  status?: 'active' | 'completed' | 'error';
  search?: string;
  limit?: number;
}): Johnny5SessionSummary[] {
  const sessions = loadSessions();

  let filtered = [...sessions];

  if (params.status) {
    filtered = filtered.filter(s => s.status === params.status);
  }

  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(searchLower) ||
      s.filesModified.some(f => f.toLowerCase().includes(searchLower))
    );
  }

  // Sort by start time descending
  filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  if (params.limit) {
    filtered = filtered.slice(0, params.limit);
  }

  return filtered.map(s => ({
    id: s.id,
    name: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    toolCalls: s.toolCalls,
    filesModified: s.filesModified,
    tokensUsed: s.tokensUsed,
    thinkingLevel: s.thinkingLevel,
    duration: s.endTime
      ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000)
      : Math.round((Date.now() - s.startTime.getTime()) / 60000),
  }));
}

/**
 * Get session detail with replay steps
 */
export function getSessionDetail(sessionId: string): Johnny5SessionDetail | null {
  const sessions = loadSessions();
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    return null;
  }

  const summary: Johnny5SessionSummary = {
    id: session.id,
    name: session.name,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    toolCalls: session.toolCalls,
    filesModified: session.filesModified,
    tokensUsed: session.tokensUsed,
    thinkingLevel: session.thinkingLevel,
    duration: session.endTime
      ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000)
      : Math.round((Date.now() - session.startTime.getTime()) / 60000),
  };

  return {
    ...summary,
    steps: session.steps,
    fileChanges: session.filesModified.map(path => ({
      path,
      type: 'modified' as const,
      linesAdded: 0, // Would need actual git diff
      linesRemoved: 0,
      timestamp: session.startTime,
    })),
    errors: session.status === 'error' ? [{
      id: 'error_1',
      message: 'Session ended with error',
      timestamp: session.endTime || new Date(),
      resolved: false,
    }] : [],
    reasoning: session.steps
      .filter(s => s.type === 'thinking')
      .map(s => s.thinking)
      .join('\n\n'),
  };
}

/**
 * Get active session count
 */
export function getActiveSessionCount(): number {
  const sessions = loadSessions();
  return sessions.filter(s => s.status === 'active').length;
}

/**
 * Clear all sessions (for testing)
 */
export function clearSessions(): void {
  sessionsCache = [];
  cacheLoaded = true;
  saveSessions();
}

// Export singleton-style functions
export const SessionTracker = {
  getOrCreateSession,
  addMessageToSession,
  completeSession,
  getSessionSummaries,
  getSessionDetail,
  getActiveSessionCount,
  clearSessions,
};

export default SessionTracker;
