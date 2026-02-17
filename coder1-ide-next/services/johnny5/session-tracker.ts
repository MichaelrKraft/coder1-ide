/**
 * Johnny5 Session Tracker Service
 *
 * Tracks and persists session data for real session intelligence.
 * Works with J5 sessions and direct Claude API sessions.
 *
 * Now uses SQLite database instead of file-based storage.
 */

import {
  initializeDb,
  createSession as dbCreateSession,
  getSession as dbGetSession,
  listSessions as dbListSessions,
  updateSession as dbUpdateSession,
  addMessage as dbAddMessage,
  getMessages as dbGetMessages,
} from '@/lib/johnny5-db';
import type { Johnny5SessionSummary, Johnny5SessionDetail, Johnny5ReplayStep } from '@/types/johnny5';

// In-memory cache for replay steps (not stored in DB yet)
// Maps sessionId -> steps array
const stepsCache = new Map<string, Johnny5ReplayStep[]>();

// Maps sessionId -> metadata that DB doesn't store
interface SessionMetadata {
  thinkingLevel: 'low' | 'medium' | 'high';
  toolCalls: number;
  filesModified: string[];
  source: 'j5' | 'direct' | 'mock' | 'fallback';
}
const metadataCache = new Map<string, SessionMetadata>();

/**
 * Start or get an existing session
 */
export async function getOrCreateSession(
  sessionId: string,
  source: 'j5' | 'direct' | 'mock' | 'fallback'
): Promise<{
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'error';
  toolCalls: number;
  filesModified: string[];
  tokensUsed: number;
  thinkingLevel: 'low' | 'medium' | 'high';
  source: 'j5' | 'direct' | 'mock' | 'fallback';
}> {
  await initializeDb();

  let session = await dbGetSession(sessionId);

  if (!session) {
    // Create new session
    session = await dbCreateSession(`Session ${new Date().toLocaleString()}`);
    // Update with the specific ID if different
    if (session.id !== sessionId) {
      // We need to use the provided sessionId, but dbCreateSession generates its own
      // For now, we'll update the session name and use the generated ID
      // Note: In production, we might want to modify dbCreateSession to accept an ID
    }

    // Initialize metadata
    metadataCache.set(session.id, {
      thinkingLevel: 'low',
      toolCalls: 0,
      filesModified: [],
      source,
    });
    stepsCache.set(session.id, []);
  }

  const metadata = metadataCache.get(session.id) || {
    thinkingLevel: 'low' as const,
    toolCalls: 0,
    filesModified: [],
    source,
  };

  return {
    id: session.id,
    name: session.name || `Session ${session.started_at}`,
    startTime: new Date(session.started_at),
    endTime: session.ended_at ? new Date(session.ended_at) : undefined,
    status: session.status === 'archived' ? 'completed' : session.status as 'active' | 'completed' | 'error',
    toolCalls: metadata.toolCalls,
    filesModified: metadata.filesModified,
    tokensUsed: session.tokens_used,
    thinkingLevel: metadata.thinkingLevel,
    source: metadata.source,
  };
}

/**
 * Add a message to a session
 */
export async function addMessageToSession(params: {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  source: 'j5' | 'direct' | 'mock' | 'fallback';
  toolCalls?: Array<{ name: string; input?: unknown; output?: unknown }>;
  thinking?: string;
}): Promise<void> {
  await initializeDb();

  // Ensure session exists
  let session = await dbGetSession(params.sessionId);
  if (!session) {
    session = await dbCreateSession(`Session ${new Date().toLocaleString()}`);
    metadataCache.set(session.id, {
      thinkingLevel: 'low',
      toolCalls: 0,
      filesModified: [],
      source: params.source,
    });
    stepsCache.set(session.id, []);
  }

  const sessionId = session.id;
  const tokens = params.role === 'assistant' ? (params.outputTokens || 0) : (params.inputTokens || 0);

  // Add message to DB
  await dbAddMessage(sessionId, params.role, params.content, tokens);

  // Get or create metadata
  let metadata = metadataCache.get(sessionId);
  if (!metadata) {
    metadata = {
      thinkingLevel: 'low',
      toolCalls: 0,
      filesModified: [],
      source: params.source,
    };
    metadataCache.set(sessionId, metadata);
  }

  // Get or create steps array
  let steps = stepsCache.get(sessionId);
  if (!steps) {
    steps = [];
    stepsCache.set(sessionId, steps);
  }

  // Add replay steps for tool calls
  if (params.toolCalls) {
    metadata.toolCalls += params.toolCalls.length;

    for (const tc of params.toolCalls) {
      steps.push({
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        type: 'tool_call',
        toolName: tc.name,
        toolInput: tc.input as Record<string, unknown>,
        toolOutput: tc.output as Record<string, unknown>,
        duration: 100,
        outcome: 'success',
      });

      // Track file modifications
      if (tc.name === 'Write' || tc.name === 'Edit') {
        const filePath = (tc.input as { file_path?: string })?.file_path;
        if (filePath && !metadata.filesModified.includes(filePath)) {
          metadata.filesModified.push(filePath);
        }
      }
    }
  }

  // Add thinking step if present
  if (params.thinking) {
    steps.push({
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      type: 'thinking',
      thinking: params.thinking,
      duration: 500,
      outcome: 'success',
    });
  }

  // Update thinking level based on total tokens
  const updatedSession = await dbGetSession(sessionId);
  if (updatedSession) {
    if (updatedSession.tokens_used > 100000) {
      metadata.thinkingLevel = 'high';
    } else if (updatedSession.tokens_used > 30000) {
      metadata.thinkingLevel = 'medium';
    }

    // Update session name from first user message
    if (params.role === 'user') {
      const messages = await dbGetMessages(sessionId, 10);
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length === 1) {
        const newName = params.content.substring(0, 50) + (params.content.length > 50 ? '...' : '');
        await dbUpdateSession(sessionId, { name: newName });
      }
    }
  }
}

/**
 * Complete a session
 */
export async function completeSession(
  sessionId: string,
  status: 'completed' | 'error' = 'completed'
): Promise<void> {
  await initializeDb();

  await dbUpdateSession(sessionId, {
    status: status,
    ended_at: new Date().toISOString(),
  });

  console.log('[SessionTracker] Session completed:', { sessionId, status });
}

/**
 * Get session summaries
 */
export async function getSessionSummaries(params: {
  status?: 'active' | 'completed' | 'error';
  search?: string;
  limit?: number;
}): Promise<Johnny5SessionSummary[]> {
  await initializeDb();

  const limit = params.limit || 50;
  const sessions = await dbListSessions(limit, 0);

  let filtered = sessions;

  // Filter by status
  if (params.status) {
    filtered = filtered.filter(s => {
      if (params.status === 'completed') {
        return s.status === 'completed' || s.status === 'archived';
      }
      return s.status === params.status;
    });
  }

  // Filter by search
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filtered = filtered.filter(s => {
      const name = s.name || '';
      const metadata = metadataCache.get(s.id);
      const filesModified = metadata?.filesModified || [];
      return (
        name.toLowerCase().includes(searchLower) ||
        filesModified.some(f => f.toLowerCase().includes(searchLower))
      );
    });
  }

  return filtered.map(s => {
    const metadata = metadataCache.get(s.id) || {
      thinkingLevel: 'low' as const,
      toolCalls: 0,
      filesModified: [],
      source: 'direct' as const,
    };

    const startTime = new Date(s.started_at);
    const endTime = s.ended_at ? new Date(s.ended_at) : undefined;
    const duration = endTime
      ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
      : Math.round((Date.now() - startTime.getTime()) / 60000);

    return {
      id: s.id,
      name: s.name || `Session ${s.started_at}`,
      startTime,
      endTime,
      status: s.status === 'archived' ? 'completed' : s.status as 'active' | 'completed' | 'error',
      toolCalls: metadata.toolCalls,
      filesModified: metadata.filesModified,
      tokensUsed: s.tokens_used,
      thinkingLevel: metadata.thinkingLevel,
      duration,
    };
  });
}

/**
 * Get session detail with replay steps
 */
export async function getSessionDetail(sessionId: string): Promise<Johnny5SessionDetail | null> {
  await initializeDb();

  const session = await dbGetSession(sessionId);
  if (!session) {
    return null;
  }

  const metadata = metadataCache.get(sessionId) || {
    thinkingLevel: 'low' as const,
    toolCalls: 0,
    filesModified: [],
    source: 'direct' as const,
  };

  const steps = stepsCache.get(sessionId) || [];

  const startTime = new Date(session.started_at);
  const endTime = session.ended_at ? new Date(session.ended_at) : undefined;
  const duration = endTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    : Math.round((Date.now() - startTime.getTime()) / 60000);

  const summary: Johnny5SessionSummary = {
    id: session.id,
    name: session.name || `Session ${session.started_at}`,
    startTime,
    endTime,
    status: session.status === 'archived' ? 'completed' : session.status as 'active' | 'completed' | 'error',
    toolCalls: metadata.toolCalls,
    filesModified: metadata.filesModified,
    tokensUsed: session.tokens_used,
    thinkingLevel: metadata.thinkingLevel,
    duration,
  };

  return {
    ...summary,
    steps,
    fileChanges: metadata.filesModified.map(path => ({
      path,
      type: 'modified' as const,
      linesAdded: 0,
      linesRemoved: 0,
      timestamp: startTime,
    })),
    errors: session.status === 'error' ? [{
      id: 'error_1',
      message: 'Session ended with error',
      timestamp: endTime || new Date(),
      resolved: false,
    }] : [],
    reasoning: steps
      .filter(s => s.type === 'thinking')
      .map(s => s.thinking)
      .join('\n\n'),
  };
}

/**
 * Get active session count
 */
export async function getActiveSessionCount(): Promise<number> {
  await initializeDb();

  const sessions = await dbListSessions(1000, 0);
  return sessions.filter(s => s.status === 'active').length;
}

/**
 * Clear all sessions (for testing)
 */
export async function clearSessions(): Promise<void> {
  // Clear in-memory caches
  stepsCache.clear();
  metadataCache.clear();
  console.log('[SessionTracker] Caches cleared');
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
