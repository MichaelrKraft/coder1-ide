/**
 * Johnny5 Cross-Session Memory
 *
 * Client-side singleton service that stores and indexes session summaries
 * for cross-session memory. When a user works on the same files or areas,
 * it surfaces relevant past sessions via `johnny5:memoryRecall` CustomEvent.
 *
 * Subscribes to:
 *   - `johnny5:sessionComplete` CustomEvent -> saves a new MemoryEntry
 *   - TerminalActivityCollector `file_modify` / `file_create` events -> tracks
 *     current files and debounces auto-recall
 *
 * Browser-only: no Node.js imports (fs, path, child_process, etc.).
 */

import { getActivityCollector } from './terminal-activity-collector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  id: string;
  timestamp: Date;
  sessionName: string;
  projectPath: string;
  filesModified: string[];
  errorPatterns: string[];
  accomplishments: string[];
  summary: string;
  handoffNotes?: string;
  branch?: string;
  tokensUsed: number;
  duration: number; // minutes
}

/** Serialised shape stored in localStorage (Date -> ISO string). */
interface StoredMemoryEntry {
  id: string;
  timestamp: string;
  sessionName: string;
  projectPath: string;
  filesModified: string[];
  errorPatterns: string[];
  accomplishments: string[];
  summary: string;
  handoffNotes?: string;
  branch?: string;
  tokensUsed: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'johnny5_session_memory';
const MAX_ENTRIES = 100;
const RETENTION_DAYS = 90;
const MAX_RECALL_RESULTS = 5;
const AUTO_RECALL_DEBOUNCE_MS = 30_000;

// Scoring weights
const SCORE_FILE_MATCH = 3;
const SCORE_ERROR_MATCH = 2;
const SCORE_PROJECT_MATCH = 1;
const SCORE_BRANCH_MATCH = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `mem_${Date.now()}_${_idCounter}`;
}

/** Strip ANSI codes and normalize whitespace for error comparison. */
function normalizeError(raw: string): string {
  let s = raw;
  s = s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  s = s.replace(/:\d+:\d+/g, ':X:X');
  s = s.replace(/\bline\s+\d+/gi, 'line X');
  s = s.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '');
  s = s.replace(/\s+/g, ' ').trim().toLowerCase();
  return s;
}

/** Extract the filename (last segment) from a path for fuzzy matching. */
function basename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] ?? filePath;
}

// ---------------------------------------------------------------------------
// SessionMemory Service
// ---------------------------------------------------------------------------

class SessionMemory {
  private entries: MemoryEntry[] = [];
  private running = false;
  private unsubscribers: Array<() => void> = [];

  // Active file tracking for auto-recall.
  private activeFiles: Set<string> = new Set();
  private recallTimer: ReturnType<typeof setTimeout> | null = null;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Subscribe to events and begin tracking. */
  start(): void {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;

    this.loadFromStorage();

    // Listen for completed sessions.
    const sessionHandler = (e: Event) => {
      const detail = (e as CustomEvent<Partial<MemoryEntry>>).detail;
      if (detail) {
        this.saveEntry(detail);
      }
    };
    window.addEventListener('johnny5:sessionComplete', sessionHandler);
    this.unsubscribers.push(() =>
      window.removeEventListener('johnny5:sessionComplete', sessionHandler),
    );

    // Track file activity for auto-recall.
    const collector = getActivityCollector();

    this.unsubscribers.push(
      collector.on('file_modify', (evt) => {
        const filePath = (evt.data?.path as string) ?? '';
        if (filePath) {
          this.activeFiles.add(filePath);
          this.scheduleAutoRecall();
        }
      }),
    );

    this.unsubscribers.push(
      collector.on('file_create', (evt) => {
        const filePath = (evt.data?.path as string) ?? '';
        if (filePath) {
          this.activeFiles.add(filePath);
          this.scheduleAutoRecall();
        }
      }),
    );

    console.log('[SessionMemory] Started');
  }

  /** Unsubscribe all listeners and stop. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.recallTimer) {
      clearTimeout(this.recallTimer);
      this.recallTimer = null;
    }

    console.log('[SessionMemory] Stopped');
  }

  /**
   * Recall the most relevant past session entries for the given context.
   *
   * Scoring:
   *   - File overlap: 3 points per matching filename
   *   - Error pattern match: 2 points per match
   *   - Same project: 1 point
   *   - Same branch: 1 point
   *
   * Returns up to 5 entries with score > 0, sorted by score then recency.
   */
  recallRelevant(context: {
    files?: string[];
    errors?: string[];
    project?: string;
    branch?: string;
  }): MemoryEntry[] {
    const contextBasenames = new Set(
      (context.files ?? []).map((f) => basename(f)),
    );
    const contextErrors = (context.errors ?? []).map((e) => normalizeError(e));

    const scored: Array<{ entry: MemoryEntry; score: number }> = [];

    for (const entry of this.entries) {
      let score = 0;

      // File overlap scoring.
      for (const file of entry.filesModified) {
        if (contextBasenames.has(basename(file))) {
          score += SCORE_FILE_MATCH;
        }
      }

      // Error pattern scoring.
      for (const entryError of entry.errorPatterns) {
        const normalizedEntry = normalizeError(entryError);
        for (const contextError of contextErrors) {
          if (
            normalizedEntry === contextError ||
            normalizedEntry.includes(contextError) ||
            contextError.includes(normalizedEntry)
          ) {
            score += SCORE_ERROR_MATCH;
            break; // Only count each entry error once.
          }
        }
      }

      // Project match.
      if (context.project && entry.projectPath === context.project) {
        score += SCORE_PROJECT_MATCH;
      }

      // Branch match.
      if (context.branch && entry.branch === context.branch) {
        score += SCORE_BRANCH_MATCH;
      }

      if (score > 0) {
        scored.push({ entry, score });
      }
    }

    // Sort by score descending, then by recency.
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.entry.timestamp.getTime() - a.entry.timestamp.getTime();
    });

    return scored.slice(0, MAX_RECALL_RESULTS).map((s) => s.entry);
  }

  /** Explicitly save the current session data as a MemoryEntry. */
  saveCurrentSession(data: Partial<MemoryEntry>): void {
    this.saveEntry(data);
  }

  /** Get all stored memory entries. */
  getEntries(): MemoryEntry[] {
    return [...this.entries];
  }

  /** Get the count of stored entries. */
  getEntryCount(): number {
    return this.entries.length;
  }

  // -----------------------------------------------------------------------
  // Internal: entry management
  // -----------------------------------------------------------------------

  private saveEntry(data: Partial<MemoryEntry>): void {
    const entry: MemoryEntry = {
      id: data.id ?? generateId(),
      timestamp: data.timestamp ?? new Date(),
      sessionName: data.sessionName ?? 'Unnamed Session',
      projectPath: data.projectPath ?? '',
      filesModified: data.filesModified ?? [],
      errorPatterns: data.errorPatterns ?? [],
      accomplishments: data.accomplishments ?? [],
      summary: data.summary ?? '',
      handoffNotes: data.handoffNotes,
      branch: data.branch,
      tokensUsed: data.tokensUsed ?? 0,
      duration: data.duration ?? 0,
    };

    this.entries.push(entry);
    this.pruneEntries();
    this.saveToStorage();
  }

  /** Remove entries beyond MAX_ENTRIES or older than RETENTION_DAYS. */
  private pruneEntries(): void {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Remove expired entries.
    this.entries = this.entries.filter(
      (e) => e.timestamp.getTime() >= cutoff,
    );

    // Enforce max count (keep the newest).
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
  }

  // -----------------------------------------------------------------------
  // Internal: auto-recall
  // -----------------------------------------------------------------------

  private scheduleAutoRecall(): void {
    if (this.recallTimer) {
      clearTimeout(this.recallTimer);
    }
    this.recallTimer = setTimeout(() => {
      this.recallTimer = null;
      this.performAutoRecall();
    }, AUTO_RECALL_DEBOUNCE_MS);
  }

  private performAutoRecall(): void {
    if (this.activeFiles.size === 0) return;

    const results = this.recallRelevant({
      files: Array.from(this.activeFiles),
    });

    if (results.length > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('johnny5:memoryRecall', { detail: results }),
      );
    }

    // Reset active files after recall so we do not re-fire the same context.
    this.activeFiles.clear();
  }

  // -----------------------------------------------------------------------
  // Internal: persistence
  // -----------------------------------------------------------------------

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const serialized: StoredMemoryEntry[] = this.entries.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch {
      // Storage full or unavailable -- ignore silently.
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: StoredMemoryEntry[] = JSON.parse(raw);
      this.entries = parsed.map((entry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));

      // Prune on load to clean out expired entries.
      this.pruneEntries();
    } catch {
      // Corrupted data -- start fresh.
      this.entries = [];
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: SessionMemory | null = null;

export function getSessionMemory(): SessionMemory {
  if (!instance) {
    instance = new SessionMemory();
  }
  return instance;
}

export default SessionMemory;
