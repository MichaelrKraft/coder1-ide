/**
 * Session Indexer
 *
 * Indexes session messages from the johnny5.db database into memory chunks
 * for semantic search. This enables Johnny5 to recall past conversations.
 *
 * Features:
 * - Batch processing for large session backlogs
 * - Incremental indexing via content hash
 * - Session metadata preservation
 * - Progress reporting
 */

import { randomUUID } from 'crypto';

import { chunkMarkdown, generateContentHash, estimateTokens } from '../chunker';
import {
  initializeDb,
  upsertMemoryChunk,
  getChunksBySource,
  deleteChunksBySource,
  listSessions,
  getMessages,
  type Session,
  type Message,
} from '@/lib/johnny5-db';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BATCH_SIZE = 10;
const MAX_MESSAGES_PER_SESSION = 1000;
const MIN_MESSAGE_LENGTH = 10; // Skip very short messages

// ============================================================================
// Types
// ============================================================================

export interface SessionIndexResult {
  chunks: number;
  skipped: number;
  messagesProcessed: number;
  error?: string;
}

export interface BatchIndexResult {
  sessions: number;
  chunks: number;
  skipped: number;
  errors: number;
}

export interface IndexProgress {
  phase: 'loading' | 'processing' | 'indexing' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
  sessionId?: string;
}

type ProgressCallback = (progress: IndexProgress) => void;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Format messages into a conversation transcript
 */
function formatSessionTranscript(
  session: Session,
  messages: Message[]
): string {
  const lines: string[] = [];

  // Add session header
  lines.push(`# Session: ${session.name || 'Unnamed Session'}`);
  lines.push(`**Started:** ${session.started_at}`);
  if (session.ended_at) {
    lines.push(`**Ended:** ${session.ended_at}`);
  }
  lines.push(`**Status:** ${session.status}`);
  lines.push('');
  lines.push('## Conversation');
  lines.push('');

  // Add messages
  for (const msg of messages) {
    const roleLabel = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
    lines.push(`### ${roleLabel}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate a source ID for a session
 */
function getSessionSourceId(sessionId: string): string {
  return `session:${sessionId}`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Index a single session's messages into memory chunks
 *
 * @param sessionId - The session ID to index
 * @param onProgress - Optional callback for progress updates
 * @returns Index result with chunk counts
 *
 * @example
 * ```typescript
 * const result = await indexSession('session-123');
 * console.log(`Indexed ${result.chunks} chunks from ${result.messagesProcessed} messages`);
 * ```
 */
export async function indexSession(
  sessionId: string,
  onProgress?: ProgressCallback
): Promise<SessionIndexResult> {
  await initializeDb();

  const sourceId = getSessionSourceId(sessionId);

  onProgress?.({
    phase: 'loading',
    current: 0,
    total: 1,
    message: `Loading session ${sessionId}`,
    sessionId,
  });

  // Get messages for this session
  let messages: Message[];
  try {
    messages = await getMessages(sessionId, MAX_MESSAGES_PER_SESSION);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to load messages';
    onProgress?.({
      phase: 'error',
      current: 0,
      total: 0,
      message: error,
      sessionId,
    });
    return { chunks: 0, skipped: 0, messagesProcessed: 0, error };
  }

  // Filter out very short messages
  const validMessages = messages.filter(m => m.content.length >= MIN_MESSAGE_LENGTH);

  if (validMessages.length === 0) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: 'No valid messages to index',
      sessionId,
    });
    return { chunks: 0, skipped: 0, messagesProcessed: 0 };
  }

  // Get session info for metadata
  const sessions = await listSessions(1000, 0);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    onProgress?.({
      phase: 'error',
      current: 0,
      total: 0,
      message: 'Session not found',
      sessionId,
    });
    return { chunks: 0, skipped: 0, messagesProcessed: 0, error: 'Session not found' };
  }

  onProgress?.({
    phase: 'processing',
    current: 0,
    total: validMessages.length,
    message: `Processing ${validMessages.length} messages`,
    sessionId,
  });

  // Format the conversation as a transcript
  const transcript = formatSessionTranscript(session, validMessages);

  // Check if content has changed via hash
  const contentHash = generateContentHash(transcript);
  const existingChunks = await getChunksBySource('session', sourceId);
  const existingHashes = new Set(existingChunks.map(c => c.content_hash));

  // If we have a single hash match for the whole transcript, skip
  if (existingChunks.length === 1 && existingHashes.has(contentHash)) {
    onProgress?.({
      phase: 'complete',
      current: validMessages.length,
      total: validMessages.length,
      message: 'Session unchanged, skipping',
      sessionId,
    });
    return { chunks: 0, skipped: 1, messagesProcessed: validMessages.length };
  }

  // Chunk the transcript
  onProgress?.({
    phase: 'indexing',
    current: 0,
    total: 1,
    message: 'Chunking conversation',
    sessionId,
  });

  const chunks = chunkMarkdown(transcript, {
    maxTokens: 500,
    overlapTokens: 50,
    preserveStructure: true,
  });

  if (chunks.length === 0) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: 'No chunks generated',
      sessionId,
    });
    return { chunks: 0, skipped: 0, messagesProcessed: validMessages.length };
  }

  // Track current hashes
  const currentHashes = new Set<string>();
  let indexed = 0;
  let skipped = 0;

  // Index each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    currentHashes.add(chunk.contentHash);

    // Skip unchanged chunks
    if (existingHashes.has(chunk.contentHash)) {
      skipped++;
      continue;
    }

    // Upsert the chunk
    await upsertMemoryChunk({
      id: randomUUID(),
      source_type: 'session',
      source_id: sourceId,
      content: chunk.content,
      content_hash: chunk.contentHash,
      start_line: chunk.startLine,
      end_line: chunk.endLine,
      token_count: chunk.tokenCount,
      heading: chunk.metadata.heading || session.name || undefined,
      section_type: 'conversation',
    });

    indexed++;

    onProgress?.({
      phase: 'indexing',
      current: i + 1,
      total: chunks.length,
      message: `Indexed chunk ${i + 1}/${chunks.length}`,
      sessionId,
    });
  }

  onProgress?.({
    phase: 'complete',
    current: chunks.length,
    total: chunks.length,
    message: `Indexed ${indexed} chunks, skipped ${skipped}`,
    sessionId,
  });

  return {
    chunks: indexed,
    skipped,
    messagesProcessed: validMessages.length,
  };
}

/**
 * Index all sessions in the database
 *
 * Processes sessions in batches to avoid memory issues with large backlogs.
 *
 * @param options - Indexing options
 * @param options.limit - Maximum number of sessions to process
 * @param options.batchSize - Number of sessions per batch
 * @param options.statusFilter - Only index sessions with this status
 * @param onProgress - Optional callback for progress updates
 * @returns Batch index results
 *
 * @example
 * ```typescript
 * const result = await indexAllSessions({ limit: 100 }, (progress) => {
 *   console.log(`${progress.phase}: ${progress.message}`);
 * });
 * console.log(`Indexed ${result.sessions} sessions with ${result.chunks} chunks`);
 * ```
 */
export async function indexAllSessions(
  options?: {
    limit?: number;
    batchSize?: number;
    statusFilter?: 'active' | 'completed' | 'archived' | 'error';
  },
  onProgress?: ProgressCallback
): Promise<BatchIndexResult> {
  await initializeDb();

  const limit = options?.limit ?? 1000;
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;

  onProgress?.({
    phase: 'loading',
    current: 0,
    total: 1,
    message: 'Loading sessions',
  });

  // Get all sessions
  let sessions = await listSessions(limit, 0);

  // Filter by status if specified
  if (options?.statusFilter) {
    sessions = sessions.filter(s => s.status === options.statusFilter);
  }

  if (sessions.length === 0) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: 'No sessions to index',
    });
    return { sessions: 0, chunks: 0, skipped: 0, errors: 0 };
  }

  onProgress?.({
    phase: 'processing',
    current: 0,
    total: sessions.length,
    message: `Processing ${sessions.length} sessions in batches of ${batchSize}`,
  });

  let totalChunks = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Process in batches
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);

    // Process batch in parallel
    const results = await Promise.all(
      batch.map(async (session) => {
        try {
          return await indexSession(session.id);
        } catch (err) {
          console.error(`[SessionIndexer] Error indexing session ${session.id}:`, err);
          return { chunks: 0, skipped: 0, messagesProcessed: 0, error: 'Processing failed' };
        }
      })
    );

    // Aggregate results
    for (const result of results) {
      if (result.error) {
        totalErrors++;
      } else {
        totalChunks += result.chunks;
        totalSkipped += result.skipped;
      }
    }

    onProgress?.({
      phase: 'processing',
      current: Math.min(i + batchSize, sessions.length),
      total: sessions.length,
      message: `Processed ${Math.min(i + batchSize, sessions.length)}/${sessions.length} sessions`,
    });
  }

  onProgress?.({
    phase: 'complete',
    current: sessions.length,
    total: sessions.length,
    message: `Completed: ${totalChunks} chunks from ${sessions.length} sessions`,
  });

  return {
    sessions: sessions.length - totalErrors,
    chunks: totalChunks,
    skipped: totalSkipped,
    errors: totalErrors,
  };
}

/**
 * Remove all chunks for a specific session
 *
 * @param sessionId - The session ID to clear
 * @returns Number of chunks deleted
 */
export async function clearSessionIndex(sessionId: string): Promise<number> {
  await initializeDb();
  const sourceId = getSessionSourceId(sessionId);
  return deleteChunksBySource('session', sourceId);
}

/**
 * Remove all session chunks from the index
 *
 * @returns Number of chunks deleted
 */
export async function clearAllSessionIndexes(): Promise<number> {
  await initializeDb();

  // Get all sessions and clear each one
  const sessions = await listSessions(10000, 0);
  let totalDeleted = 0;

  for (const session of sessions) {
    const deleted = await clearSessionIndex(session.id);
    totalDeleted += deleted;
  }

  return totalDeleted;
}

/**
 * Get indexing statistics for sessions
 */
export async function getSessionIndexStats(): Promise<{
  totalSessions: number;
  indexedSessions: number;
  pendingSessions: number;
}> {
  await initializeDb();

  const sessions = await listSessions(10000, 0);
  const indexedSet = new Set<string>();

  // Check which sessions have been indexed
  for (const session of sessions) {
    const sourceId = getSessionSourceId(session.id);
    const chunks = await getChunksBySource('session', sourceId);
    if (chunks.length > 0) {
      indexedSet.add(session.id);
    }
  }

  return {
    totalSessions: sessions.length,
    indexedSessions: indexedSet.size,
    pendingSessions: sessions.length - indexedSet.size,
  };
}

export default {
  indexSession,
  indexAllSessions,
  clearSessionIndex,
  clearAllSessionIndexes,
  getSessionIndexStats,
};
