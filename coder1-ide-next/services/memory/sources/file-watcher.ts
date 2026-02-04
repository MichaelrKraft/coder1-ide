/**
 * ManusLive File Watcher Service
 *
 * Watches ManusLive memory files (~/.manuslive/workspace/) for changes
 * and triggers re-indexing when files are modified.
 *
 * Features:
 * - Debounced file change detection (2-second delay)
 * - Automatic re-indexing on file changes
 * - File deletion detection (clears index)
 * - Singleton pattern (prevents duplicate watchers)
 * - Graceful cleanup on stop
 */

import { watch, FSWatcher } from 'chokidar';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { EventEmitter } from 'events';

import {
  indexManusLiveMemory,
  indexManusLiveUser,
  clearManusLiveIndex,
  type IndexResult,
} from './manuslive-indexer';

// ============================================================================
// Constants
// ============================================================================

const MANUSLIVE_DIR = join(homedir(), '.manuslive', 'workspace');
const MEMORY_FILE = 'MEMORY.md';
const USER_FILE = 'USER.md';
const DEBOUNCE_MS = 2000; // 2 seconds

// ============================================================================
// Types
// ============================================================================

export interface WatcherEvent {
  type: 'change' | 'add' | 'unlink' | 'error';
  file: 'memory' | 'user' | 'unknown';
  path: string;
  timestamp: Date;
  indexResult?: IndexResult;
  error?: string;
}

export interface WatcherStatus {
  isRunning: boolean;
  watchedPath: string;
  memoryFileExists: boolean;
  userFileExists: boolean;
  lastEvent?: WatcherEvent;
  startedAt?: Date;
}

type WatcherEventCallback = (event: WatcherEvent) => void;

// ============================================================================
// File Watcher Singleton
// ============================================================================

class ManusLiveFileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isWatching = false;
  private startedAt: Date | null = null;
  private lastEvent: WatcherEvent | null = null;
  private indexingInProgress: Set<string> = new Set();

  /**
   * Start watching ManusLive files
   */
  start(): boolean {
    // Prevent duplicate watchers
    if (this.isWatching) {
      console.log('[FileWatcher] Watcher already running');
      return false;
    }

    // Check if directory exists
    if (!existsSync(MANUSLIVE_DIR)) {
      console.log('[FileWatcher] ManusLive directory not found:', MANUSLIVE_DIR);
      this.emit('error', {
        type: 'error',
        file: 'unknown',
        path: MANUSLIVE_DIR,
        timestamp: new Date(),
        error: 'ManusLive directory not found',
      });
      return false;
    }

    console.log('[FileWatcher] Starting watch on:', MANUSLIVE_DIR);

    // Create watcher
    this.watcher = watch(MANUSLIVE_DIR, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
      // Only watch markdown files
      ignored: (path: string) => {
        const filename = path.split('/').pop() || '';
        return filename !== MEMORY_FILE && filename !== USER_FILE && !path.endsWith(MANUSLIVE_DIR);
      },
    });

    // Set up event handlers
    this.watcher.on('change', (path) => this.handleFileChange('change', path));
    this.watcher.on('add', (path) => this.handleFileChange('add', path));
    this.watcher.on('unlink', (path) => this.handleFileDelete(path));
    this.watcher.on('error', (error: Error) => this.handleError(error));

    this.watcher.on('ready', () => {
      console.log('[FileWatcher] Watcher ready');
      this.isWatching = true;
      this.startedAt = new Date();
      this.emit('ready', {
        watchedPath: MANUSLIVE_DIR,
        memoryFile: join(MANUSLIVE_DIR, MEMORY_FILE),
        userFile: join(MANUSLIVE_DIR, USER_FILE),
      });
    });

    return true;
  }

  /**
   * Stop watching files
   */
  stop(): void {
    if (!this.watcher) {
      console.log('[FileWatcher] No watcher to stop');
      return;
    }

    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();

    // Close watcher
    this.watcher.close().then(() => {
      console.log('[FileWatcher] Watcher stopped');
    });

    this.watcher = null;
    this.isWatching = false;
    this.startedAt = null;
    this.indexingInProgress.clear();

    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this.isWatching;
  }

  /**
   * Get current watcher status
   */
  getStatus(): WatcherStatus {
    return {
      isRunning: this.isWatching,
      watchedPath: MANUSLIVE_DIR,
      memoryFileExists: existsSync(join(MANUSLIVE_DIR, MEMORY_FILE)),
      userFileExists: existsSync(join(MANUSLIVE_DIR, USER_FILE)),
      lastEvent: this.lastEvent || undefined,
      startedAt: this.startedAt || undefined,
    };
  }

  /**
   * Manually trigger reindex for a file
   */
  async triggerReindex(file: 'memory' | 'user' | 'all'): Promise<IndexResult | { memory: IndexResult; user: IndexResult }> {
    if (file === 'all') {
      const memory = await indexManusLiveMemory();
      const user = await indexManusLiveUser();
      return { memory, user };
    }

    if (file === 'memory') {
      return indexManusLiveMemory();
    }

    return indexManusLiveUser();
  }

  /**
   * Handle file change (debounced)
   */
  private handleFileChange(eventType: 'change' | 'add', path: string): void {
    const filename = path.split('/').pop() || '';

    // Clear existing debounce timer for this file
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(path);
      await this.processFileChange(eventType, path);
    }, DEBOUNCE_MS);

    this.debounceTimers.set(path, timer);

    console.log(`[FileWatcher] File ${eventType} detected: ${filename} (will process in ${DEBOUNCE_MS}ms)`);
  }

  /**
   * Process file change after debounce
   */
  private async processFileChange(eventType: 'change' | 'add', path: string): Promise<void> {
    const filename = path.split('/').pop() || '';
    const fileType = this.getFileType(filename);

    // Prevent concurrent indexing of the same file
    if (this.indexingInProgress.has(path)) {
      console.log(`[FileWatcher] Indexing already in progress for: ${filename}`);
      return;
    }

    this.indexingInProgress.add(path);

    const event: WatcherEvent = {
      type: eventType,
      file: fileType,
      path,
      timestamp: new Date(),
    };

    console.log(`[FileWatcher] Processing ${eventType} for: ${filename}`);

    try {
      let indexResult: IndexResult;

      if (fileType === 'memory') {
        indexResult = await indexManusLiveMemory();
      } else if (fileType === 'user') {
        indexResult = await indexManusLiveUser();
      } else {
        console.log(`[FileWatcher] Ignoring unknown file: ${filename}`);
        this.indexingInProgress.delete(path);
        return;
      }

      event.indexResult = indexResult;
      console.log(`[FileWatcher] Indexed ${indexResult.chunks} chunks, skipped ${indexResult.skipped}`);
    } catch (err) {
      event.error = err instanceof Error ? err.message : 'Unknown indexing error';
      console.error(`[FileWatcher] Indexing error for ${filename}:`, err);
    }

    this.lastEvent = event;
    this.indexingInProgress.delete(path);
    this.emit('indexed', event);
  }

  /**
   * Handle file deletion
   */
  private async handleFileDelete(path: string): Promise<void> {
    const filename = path.split('/').pop() || '';
    const fileType = this.getFileType(filename);

    console.log(`[FileWatcher] File deleted: ${filename}`);

    const event: WatcherEvent = {
      type: 'unlink',
      file: fileType,
      path,
      timestamp: new Date(),
    };

    try {
      // Clear chunks for the deleted file
      if (fileType !== 'unknown') {
        const result = await clearManusLiveIndex();
        console.log(`[FileWatcher] Cleared index: memory=${result.memoryDeleted}, user=${result.userDeleted}`);
      }
    } catch (err) {
      event.error = err instanceof Error ? err.message : 'Unknown error clearing index';
      console.error(`[FileWatcher] Error clearing index for ${filename}:`, err);
    }

    this.lastEvent = event;
    this.emit('deleted', event);
  }

  /**
   * Handle watcher errors
   */
  private handleError(error: Error): void {
    console.error('[FileWatcher] Watcher error:', error);

    const event: WatcherEvent = {
      type: 'error',
      file: 'unknown',
      path: MANUSLIVE_DIR,
      timestamp: new Date(),
      error: error.message,
    };

    this.lastEvent = event;
    this.emit('error', event);
  }

  /**
   * Determine file type from filename
   */
  private getFileType(filename: string): 'memory' | 'user' | 'unknown' {
    if (filename === MEMORY_FILE) return 'memory';
    if (filename === USER_FILE) return 'user';
    return 'unknown';
  }

  /**
   * Register event callback
   */
  onEvent(callback: WatcherEventCallback): void {
    this.on('indexed', callback);
    this.on('deleted', callback);
    this.on('error', callback);
  }

  /**
   * Remove event callback
   */
  offEvent(callback: WatcherEventCallback): void {
    this.off('indexed', callback);
    this.off('deleted', callback);
    this.off('error', callback);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

const watcherInstance = new ManusLiveFileWatcher();

// ============================================================================
// Public API
// ============================================================================

/**
 * Start the file watcher
 *
 * Watches ~/.manuslive/workspace/ for changes to MEMORY.md and USER.md.
 * Changes are debounced (2 seconds) before triggering reindex.
 *
 * @returns true if watcher started, false if already running or failed
 *
 * @example
 * ```typescript
 * startFileWatcher();
 *
 * // Listen for events
 * watcherInstance.onEvent((event) => {
 *   console.log(`${event.type} on ${event.file}: ${event.indexResult?.chunks} chunks`);
 * });
 * ```
 */
export function startFileWatcher(): boolean {
  return watcherInstance.start();
}

/**
 * Stop the file watcher
 *
 * Cleans up all resources and stops watching for changes.
 */
export function stopFileWatcher(): void {
  watcherInstance.stop();
}

/**
 * Check if the file watcher is currently running
 */
export function isWatcherRunning(): boolean {
  return watcherInstance.isRunning();
}

/**
 * Get the current watcher status
 *
 * @returns Status object with watcher state and file existence
 */
export function getWatcherStatus(): WatcherStatus {
  return watcherInstance.getStatus();
}

/**
 * Manually trigger a reindex without waiting for file changes
 *
 * @param file - Which file to reindex ('memory', 'user', or 'all')
 */
export async function triggerManualReindex(
  file: 'memory' | 'user' | 'all' = 'all'
): Promise<IndexResult | { memory: IndexResult; user: IndexResult }> {
  return watcherInstance.triggerReindex(file);
}

/**
 * Register a callback for watcher events
 *
 * @param callback - Function called when events occur
 */
export function onWatcherEvent(callback: WatcherEventCallback): void {
  watcherInstance.onEvent(callback);
}

/**
 * Remove a watcher event callback
 *
 * @param callback - Previously registered callback
 */
export function offWatcherEvent(callback: WatcherEventCallback): void {
  watcherInstance.offEvent(callback);
}

/**
 * Get the raw watcher instance for advanced usage
 *
 * Use with caution - prefer the exported functions.
 */
export function getWatcherInstance(): ManusLiveFileWatcher {
  return watcherInstance;
}

export default {
  startFileWatcher,
  stopFileWatcher,
  isWatcherRunning,
  getWatcherStatus,
  triggerManualReindex,
  onWatcherEvent,
  offWatcherEvent,
};
