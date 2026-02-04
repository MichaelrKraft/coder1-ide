/**
 * Johnny5 Memory Source Integration
 *
 * Barrel export for all source indexers and the file watcher service.
 *
 * ## Overview
 *
 * This module provides indexing capabilities for Johnny5's unified memory system:
 *
 * - **ManusLive Indexer**: Indexes MEMORY.md and USER.md from ~/.manuslive/workspace/
 * - **Session Indexer**: Indexes conversation history from johnny5.db
 * - **File Watcher**: Watches ManusLive files for changes and triggers re-indexing
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   indexAllManusLive,
 *   indexAllSessions,
 *   startFileWatcher,
 *   stopFileWatcher,
 * } from '@/services/memory/sources';
 *
 * // Index all sources on startup
 * await indexAllManusLive();
 * await indexAllSessions({ limit: 100 });
 *
 * // Start watching for changes
 * startFileWatcher();
 *
 * // On shutdown
 * stopFileWatcher();
 * ```
 *
 * ## Architecture
 *
 * All indexers use the chunker service to split content into semantically
 * coherent pieces, which are then stored in the memory_chunks table with
 * content hashes for deduplication.
 *
 * The file watcher uses chokidar for cross-platform file watching with
 * debouncing to prevent excessive re-indexing during rapid file changes.
 */

// ManusLive Indexer
export {
  indexManusLiveMemory,
  indexManusLiveUser,
  indexAllManusLive,
  clearManusLiveIndex,
  getManusLiveStatus,
  getFileContentHash,
  type IndexResult,
  type IndexProgress,
} from './manuslive-indexer';

// Session Indexer
export {
  indexSession,
  indexAllSessions,
  clearSessionIndex,
  clearAllSessionIndexes,
  getSessionIndexStats,
  type SessionIndexResult,
  type BatchIndexResult,
} from './session-indexer';

// File Watcher
export {
  startFileWatcher,
  stopFileWatcher,
  isWatcherRunning,
  getWatcherStatus,
  triggerManualReindex,
  onWatcherEvent,
  offWatcherEvent,
  getWatcherInstance,
  type WatcherEvent,
  type WatcherStatus,
} from './file-watcher';

// ============================================================================
// Convenience Functions
// ============================================================================

import { indexAllManusLive } from './manuslive-indexer';
import { indexAllSessions } from './session-indexer';
import { startFileWatcher, stopFileWatcher, isWatcherRunning } from './file-watcher';

/**
 * Initialize all memory sources
 *
 * Indexes ManusLive files and recent sessions, then starts the file watcher.
 * This is the recommended way to initialize the memory system on startup.
 *
 * @param options - Initialization options
 * @returns Summary of initialization results
 *
 * @example
 * ```typescript
 * const result = await initializeMemorySources();
 * console.log(`Indexed ${result.totalChunks} chunks`);
 * console.log(`File watcher: ${result.watcherStarted ? 'running' : 'failed'}`);
 * ```
 */
export async function initializeMemorySources(
  options?: {
    indexManusLive?: boolean;
    indexSessions?: boolean;
    sessionLimit?: number;
    startWatcher?: boolean;
    onProgress?: (message: string) => void;
  }
): Promise<{
  manusLive: { chunks: number; skipped: number } | null;
  sessions: { sessions: number; chunks: number } | null;
  watcherStarted: boolean;
  totalChunks: number;
}> {
  const {
    indexManusLive: shouldIndexManusLive = true,
    indexSessions: shouldIndexSessions = true,
    sessionLimit = 50,
    startWatcher: shouldStartWatcher = true,
    onProgress,
  } = options || {};

  let manusLiveResult: { chunks: number; skipped: number } | null = null;
  let sessionsResult: { sessions: number; chunks: number } | null = null;
  let watcherStarted = false;
  let totalChunks = 0;

  // Index ManusLive files
  if (shouldIndexManusLive) {
    onProgress?.('Indexing ManusLive files...');
    const result = await indexAllManusLive();
    manusLiveResult = {
      chunks: result.totalChunks,
      skipped: result.totalSkipped,
    };
    totalChunks += result.totalChunks;
    onProgress?.(`ManusLive: ${result.totalChunks} chunks indexed`);
  }

  // Index sessions
  if (shouldIndexSessions) {
    onProgress?.('Indexing session history...');
    const result = await indexAllSessions({ limit: sessionLimit });
    sessionsResult = {
      sessions: result.sessions,
      chunks: result.chunks,
    };
    totalChunks += result.chunks;
    onProgress?.(`Sessions: ${result.chunks} chunks from ${result.sessions} sessions`);
  }

  // Start file watcher
  if (shouldStartWatcher && !isWatcherRunning()) {
    onProgress?.('Starting file watcher...');
    watcherStarted = startFileWatcher();
    onProgress?.(watcherStarted ? 'File watcher started' : 'File watcher failed to start');
  } else if (isWatcherRunning()) {
    watcherStarted = true;
    onProgress?.('File watcher already running');
  }

  return {
    manusLive: manusLiveResult,
    sessions: sessionsResult,
    watcherStarted,
    totalChunks,
  };
}

/**
 * Cleanup memory sources
 *
 * Stops the file watcher. Call this on application shutdown.
 */
export function cleanupMemorySources(): void {
  if (isWatcherRunning()) {
    stopFileWatcher();
  }
}
