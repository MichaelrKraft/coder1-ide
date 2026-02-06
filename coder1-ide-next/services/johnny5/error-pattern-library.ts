/**
 * Johnny5 Error Pattern Library
 *
 * Client-side singleton service that remembers how errors were resolved and
 * auto-suggests fixes when the same error recurs. Subscribes to the
 * TerminalActivityCollector via its .on() API and emits
 * `johnny5:knownErrorMatch` CustomEvents on `window`.
 *
 * Browser-only: no Node.js imports (fs, path, child_process, etc.).
 */

import { getActivityCollector } from './terminal-activity-collector';
import type { ActivityEvent } from './terminal-activity-collector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorResolution {
  description: string;
  filesModified: string[];
  commandsRun: string[];
  resolvedAt: Date;
}

export interface ErrorPattern {
  id: string;
  normalizedError: string;
  originalError: string;
  resolution: ErrorResolution;
  hitCount: number;
  lastSeen: Date;
  firstSeen: Date;
  confidence: number;
}

/** Serialization-friendly version stored in localStorage. */
interface StoredPattern {
  id: string;
  normalizedError: string;
  originalError: string;
  resolution: {
    description: string;
    filesModified: string[];
    commandsRun: string[];
    resolvedAt: string;
  };
  hitCount: number;
  lastSeen: string;
  firstSeen: string;
  confidence: number;
}

/** Payload emitted via the johnny5:knownErrorMatch CustomEvent. */
export interface KnownErrorMatchDetail {
  pattern: ErrorPattern;
  suggestion: string;
  lastResolved: Date;
  confidence: number;
}

/** Internal tracking for an unresolved error awaiting resolution. */
interface PendingError {
  id: string;
  normalizedError: string;
  originalError: string;
  timestamp: number;
  fileModifications: string[];
  commandsRun: string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'johnny5_error_patterns';
const MAX_PATTERNS = 200;
const RETENTION_DAYS = 90;
const RESOLUTION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const SIMILARITY_THRESHOLD = 0.7;
const MAX_PENDING = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `errpat_${Date.now()}_${_idCounter}`;
}

/**
 * Normalize an error message for comparison: strip ANSI codes, line numbers,
 * timestamps, file paths, and extra whitespace so that semantically identical
 * errors are grouped together.
 */
function normalizeError(raw: string): string {
  let s = raw;
  // Strip ANSI escape codes.
  s = s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // Strip file paths (Unix and Windows).
  s = s.replace(/(?:\/[\w.\-]+)+(?::\d+(?::\d+)?)?/g, '<path>');
  s = s.replace(/(?:[A-Z]:\\[\w.\-\\]+)+(?::\d+(?::\d+)?)?/g, '<path>');
  // Strip line:col references like ":42:17" or "(42, 17)" or "line 42".
  s = s.replace(/:\d+:\d+/g, ':X:X');
  s = s.replace(/\(\d+,\s*\d+\)/g, '(X, X)');
  s = s.replace(/\bline\s+\d+/gi, 'line X');
  // Strip ISO timestamps and common date formats.
  s = s.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '');
  s = s.replace(/\d{2}:\d{2}:\d{2}/g, '');
  // Strip hex addresses.
  s = s.replace(/0x[0-9a-fA-F]+/g, '<addr>');
  // Collapse whitespace.
  s = s.replace(/\s+/g, ' ').trim();
  // Lowercase for consistent matching.
  return s.toLowerCase();
}

/**
 * Compute Jaccard similarity between two strings using word overlap.
 * Returns a value between 0 and 1.
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/).filter(Boolean));
  const setB = new Set(b.split(/\s+/).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Build a human-readable description of the resolution from tracked data.
 */
function buildResolutionDescription(
  filesModified: string[],
  commandsRun: string[],
): string {
  const parts: string[] = [];
  if (filesModified.length > 0) {
    parts.push(`Modified ${filesModified.length} file(s): ${filesModified.slice(0, 3).join(', ')}`);
  }
  if (commandsRun.length > 0) {
    parts.push(`Ran: ${commandsRun.slice(0, 3).join(', ')}`);
  }
  if (parts.length === 0) {
    return 'Error was resolved (no specific steps captured)';
  }
  return parts.join('. ');
}

// ---------------------------------------------------------------------------
// Error Pattern Library
// ---------------------------------------------------------------------------

class ErrorPatternLibrary {
  private patterns: ErrorPattern[] = [];
  private pendingErrors: PendingError[] = [];
  private unsubscribers: Array<() => void> = [];
  private running = false;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Subscribe to TerminalActivityCollector events and begin tracking. */
  start(): void {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;
    this.loadFromStorage();

    const collector = getActivityCollector();

    // Track new errors.
    this.unsubscribers.push(
      collector.on('error_encountered', (evt) => this.onErrorEncountered(evt)),
    );

    // Track resolution signals.
    this.unsubscribers.push(
      collector.on('error_resolved', (evt) => this.onResolutionSignal(evt)),
      collector.on('build_success', (evt) => this.onResolutionSignal(evt)),
      collector.on('test_pass', (evt) => this.onResolutionSignal(evt)),
    );

    // Track file modifications and commands between error and resolution.
    this.unsubscribers.push(
      collector.on('file_modify', (evt) => this.onFileModify(evt)),
      collector.on('user_prompt', (evt) => this.onUserCommand(evt)),
    );

    // Periodically expire stale pending errors (every 60s).
    this.cleanupTimer = setInterval(() => this.expirePendingErrors(), 60_000);

    console.log('[ErrorPatternLibrary] Started');
  }

  /** Unsubscribe all listeners and stop tracking. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log('[ErrorPatternLibrary] Stopped');
  }

  /** Get all stored patterns. */
  getPatterns(): ErrorPattern[] {
    return [...this.patterns];
  }

  /** Get patterns sorted by hit count (most frequent first). */
  getTopPatterns(limit = 10): ErrorPattern[] {
    return [...this.patterns]
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);
  }

  /** Downgrade confidence for a pattern (e.g., user dismissed as "Not Helpful"). */
  downgradeConfidence(patternId: string): void {
    const pattern = this.patterns.find((p) => p.id === patternId);
    if (pattern) {
      pattern.confidence = Math.max(0, pattern.confidence - 0.2);
      this.saveToStorage();
    }
  }

  /** Remove a pattern entirely. */
  removePattern(patternId: string): void {
    this.patterns = this.patterns.filter((p) => p.id !== patternId);
    this.saveToStorage();
  }

  /** Clear all stored patterns. */
  clearAll(): void {
    this.patterns = [];
    this.pendingErrors = [];
    this.saveToStorage();
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private onErrorEncountered(evt: ActivityEvent): void {
    const raw = evt.rawOutput ?? '';
    if (!raw || raw.length < 5) return;

    const normalized = normalizeError(raw);
    if (normalized.length < 5) return;

    // Check if this matches a known pattern.
    const match = this.findMatchingPattern(normalized);
    if (match && match.confidence >= SIMILARITY_THRESHOLD) {
      // Update hit count and last seen.
      match.hitCount += 1;
      match.lastSeen = new Date();
      this.saveToStorage();
      this.emitKnownErrorMatch(match);
    }

    // Track as a pending error awaiting resolution.
    if (this.pendingErrors.length >= MAX_PENDING) {
      this.pendingErrors.shift();
    }
    this.pendingErrors.push({
      id: generateId(),
      normalizedError: normalized,
      originalError: raw.slice(0, 500),
      timestamp: Date.now(),
      fileModifications: [],
      commandsRun: [],
    });
  }

  private onResolutionSignal(_evt: ActivityEvent): void {
    const now = Date.now();

    // Find pending errors within the resolution window.
    const resolved = this.pendingErrors.filter(
      (pe) => now - pe.timestamp <= RESOLUTION_WINDOW_MS,
    );

    for (const pending of resolved) {
      this.recordResolution(pending);
    }

    // Clear all pending errors that have been resolved.
    if (resolved.length > 0) {
      const resolvedIds = new Set(resolved.map((r) => r.id));
      this.pendingErrors = this.pendingErrors.filter(
        (pe) => !resolvedIds.has(pe.id),
      );
    }
  }

  private onFileModify(evt: ActivityEvent): void {
    const filePath = (evt.data?.path as string) ?? '';
    if (!filePath) return;

    // Append file modification to all pending errors.
    for (const pending of this.pendingErrors) {
      if (!pending.fileModifications.includes(filePath)) {
        pending.fileModifications.push(filePath);
      }
    }
  }

  private onUserCommand(evt: ActivityEvent): void {
    const command = (evt.data?.command as string) ?? '';
    if (!command) return;

    // Append command to all pending errors.
    for (const pending of this.pendingErrors) {
      if (!pending.commandsRun.includes(command)) {
        pending.commandsRun.push(command);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pattern matching
  // -------------------------------------------------------------------------

  /** Find the best matching stored pattern for a normalized error. */
  private findMatchingPattern(normalized: string): ErrorPattern | null {
    let bestMatch: ErrorPattern | null = null;
    let bestSimilarity = 0;

    for (const pattern of this.patterns) {
      const similarity = jaccardSimilarity(normalized, pattern.normalizedError);
      // Weight by stored confidence to prefer reliable patterns.
      const weightedScore = similarity * pattern.confidence;
      if (similarity >= SIMILARITY_THRESHOLD && weightedScore > bestSimilarity) {
        bestSimilarity = weightedScore;
        bestMatch = pattern;
      }
    }

    return bestMatch;
  }

  // -------------------------------------------------------------------------
  // Resolution recording
  // -------------------------------------------------------------------------

  /** Record a resolved error as a new pattern or update an existing one. */
  private recordResolution(pending: PendingError): void {
    const description = buildResolutionDescription(
      pending.fileModifications,
      pending.commandsRun,
    );

    const resolution: ErrorResolution = {
      description,
      filesModified: pending.fileModifications.slice(0, 10),
      commandsRun: pending.commandsRun.slice(0, 10),
      resolvedAt: new Date(),
    };

    // Check if we already have a pattern for this error.
    const existing = this.findMatchingPattern(pending.normalizedError);
    if (existing && jaccardSimilarity(pending.normalizedError, existing.normalizedError) >= SIMILARITY_THRESHOLD) {
      // Update existing pattern with new resolution data.
      existing.resolution = resolution;
      existing.hitCount += 1;
      existing.lastSeen = new Date();
      // Boost confidence on successful resolution.
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      this.saveToStorage();
      return;
    }

    // Create a new pattern.
    const newPattern: ErrorPattern = {
      id: generateId(),
      normalizedError: pending.normalizedError,
      originalError: pending.originalError,
      resolution,
      hitCount: 1,
      lastSeen: new Date(),
      firstSeen: new Date(),
      confidence: 0.5,
    };

    this.patterns.push(newPattern);
    this.enforceMaxPatterns();
    this.saveToStorage();
  }

  // -------------------------------------------------------------------------
  // Lifecycle helpers
  // -------------------------------------------------------------------------

  /** Remove pending errors older than the resolution window. */
  private expirePendingErrors(): void {
    const cutoff = Date.now() - RESOLUTION_WINDOW_MS;
    this.pendingErrors = this.pendingErrors.filter((pe) => pe.timestamp > cutoff);
  }

  /** Enforce the max pattern count by removing the oldest, lowest-confidence patterns. */
  private enforceMaxPatterns(): void {
    if (this.patterns.length <= MAX_PATTERNS) return;

    // Sort by confidence ascending, then by lastSeen ascending (oldest first).
    this.patterns.sort((a, b) => {
      const confDiff = a.confidence - b.confidence;
      if (confDiff !== 0) return confDiff;
      return a.lastSeen.getTime() - b.lastSeen.getTime();
    });

    // Remove excess from the front (lowest confidence / oldest).
    this.patterns = this.patterns.slice(this.patterns.length - MAX_PATTERNS);
  }

  // -------------------------------------------------------------------------
  // Event emission
  // -------------------------------------------------------------------------

  /** Emit a johnny5:knownErrorMatch CustomEvent. */
  private emitKnownErrorMatch(pattern: ErrorPattern): void {
    if (typeof window === 'undefined') return;

    const detail: KnownErrorMatchDetail = {
      pattern,
      suggestion: pattern.resolution.description,
      lastResolved: pattern.resolution.resolvedAt,
      confidence: pattern.confidence,
    };

    window.dispatchEvent(
      new CustomEvent('johnny5:knownErrorMatch', { detail }),
    );
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const serialized: StoredPattern[] = this.patterns.map((p) => ({
        id: p.id,
        normalizedError: p.normalizedError,
        originalError: p.originalError,
        resolution: {
          description: p.resolution.description,
          filesModified: p.resolution.filesModified,
          commandsRun: p.resolution.commandsRun,
          resolvedAt: p.resolution.resolvedAt.toISOString(),
        },
        hitCount: p.hitCount,
        lastSeen: p.lastSeen.toISOString(),
        firstSeen: p.firstSeen.toISOString(),
        confidence: p.confidence,
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

      const parsed: StoredPattern[] = JSON.parse(raw);
      const now = Date.now();
      const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

      this.patterns = parsed
        .filter((entry) => {
          // Discard patterns older than the retention period.
          const lastSeen = new Date(entry.lastSeen).getTime();
          return now - lastSeen < retentionMs;
        })
        .map((entry) => ({
          id: entry.id,
          normalizedError: entry.normalizedError,
          originalError: entry.originalError,
          resolution: {
            description: entry.resolution.description,
            filesModified: entry.resolution.filesModified,
            commandsRun: entry.resolution.commandsRun,
            resolvedAt: new Date(entry.resolution.resolvedAt),
          },
          hitCount: entry.hitCount,
          lastSeen: new Date(entry.lastSeen),
          firstSeen: new Date(entry.firstSeen),
          confidence: entry.confidence,
        }));

      // If we evicted expired entries, persist the trimmed list.
      if (this.patterns.length < parsed.length) {
        this.saveToStorage();
      }
    } catch {
      // Corrupted data -- start fresh.
      this.patterns = [];
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: ErrorPatternLibrary | null = null;

export function getErrorPatternLibrary(): ErrorPatternLibrary {
  if (!instance) {
    instance = new ErrorPatternLibrary();
  }
  return instance;
}

export default ErrorPatternLibrary;
