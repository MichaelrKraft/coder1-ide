/**
 * Johnny5 Pattern Detector
 *
 * Client-side singleton service that detects when Claude Code is stuck in a
 * loop -- repeating the same fix, thrashing on a file, or hitting the same
 * error multiple times. Subscribes to the TerminalActivityCollector via its
 * .on() API and emits `johnny5:loopDetected` CustomEvents on `window`.
 *
 * Browser-only: no Node.js imports (fs, path, child_process, etc.).
 */

import { getActivityCollector } from './terminal-activity-collector';
import type { ActivityEvent } from './terminal-activity-collector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoopAlertType =
  | 'repeated_error'
  | 'file_thrashing'
  | 'build_loop'
  | 'test_loop'
  | 'stuck_after_error';

export interface LoopAlert {
  id: string;
  timestamp: Date;
  type: LoopAlertType;
  severity: 'warning' | 'critical';
  message: string;
  suggestion: string;
  occurrences: number;
  pattern: string;
  dismissed: boolean;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** How many repeated occurrences before alerting. */
const ERROR_REPEAT_THRESHOLD = 3;
/** Time window for repeated error detection (ms). */
const ERROR_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** How many modifications to the same file before alerting. */
const FILE_THRASH_THRESHOLD = 3;
/** Time window for file thrashing detection (ms). */
const FILE_THRASH_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/** How many consecutive build/test failures before alerting. */
const BUILD_LOOP_THRESHOLD = 3;
const TEST_LOOP_THRESHOLD = 3;

/** How long after an error with no activity before "stuck" alert (ms). */
const STUCK_TIMEOUT_MS = 60 * 1000; // 60 seconds

/** Max events to keep per ring buffer. */
const RING_BUFFER_SIZE = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `loop_${Date.now()}_${_idCounter}`;
}

/**
 * Normalize an error message for comparison: strip ANSI codes, line numbers,
 * timestamps, and extra whitespace so that semantically identical errors
 * are grouped together.
 */
function normalizeError(raw: string): string {
  let s = raw;
  // Strip ANSI escape codes.
  s = s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // Strip line:col references like ":42:17" or "(42, 17)" or "line 42".
  s = s.replace(/:\d+:\d+/g, ':X:X');
  s = s.replace(/\(\d+,\s*\d+\)/g, '(X, X)');
  s = s.replace(/\bline\s+\d+/gi, 'line X');
  // Strip ISO timestamps and common date formats.
  s = s.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '');
  s = s.replace(/\d{2}:\d{2}:\d{2}/g, '');
  // Collapse whitespace.
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ---------------------------------------------------------------------------
// Ring Buffer
// ---------------------------------------------------------------------------

class RingBuffer<T> {
  private items: T[] = [];
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  push(item: T): void {
    if (this.items.length >= this.capacity) {
      this.items.shift();
    }
    this.items.push(item);
  }

  /** Return items within the last `windowMs` milliseconds. */
  since(windowMs: number, getTime: (item: T) => number): T[] {
    const cutoff = Date.now() - windowMs;
    return this.items.filter((item) => getTime(item) >= cutoff);
  }

  getAll(): T[] {
    return [...this.items];
  }

  clear(): void {
    this.items = [];
  }
}

// ---------------------------------------------------------------------------
// Pattern Detector
// ---------------------------------------------------------------------------

class PatternDetector {
  private alerts: Map<string, LoopAlert> = new Map();
  private unsubscribers: Array<() => void> = [];
  private running = false;

  // Ring buffers for each tracked event type.
  private errorBuffer = new RingBuffer<ActivityEvent>(RING_BUFFER_SIZE);
  private fileModifyBuffer = new RingBuffer<ActivityEvent>(RING_BUFFER_SIZE);
  private buildBuffer = new RingBuffer<ActivityEvent>(RING_BUFFER_SIZE);
  private testBuffer = new RingBuffer<ActivityEvent>(RING_BUFFER_SIZE);

  // Consecutive failure counters (reset on success).
  private consecutiveBuildFails = 0;
  private consecutiveTestFails = 0;

  // Stuck detection state.
  private lastErrorTime: number | null = null;
  private stuckTimer: ReturnType<typeof setTimeout> | null = null;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Subscribe to the TerminalActivityCollector and begin detecting patterns. */
  start(): void {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;

    const collector = getActivityCollector();

    this.unsubscribers.push(
      collector.on('error_encountered', (evt) => this.onError(evt)),
      collector.on('file_modify', (evt) => this.onFileModify(evt)),
      collector.on('build_fail', (evt) => this.onBuildFail(evt)),
      collector.on('build_success', (evt) => this.onBuildSuccess()),
      collector.on('test_fail', (evt) => this.onTestFail(evt)),
      collector.on('test_pass', (evt) => this.onTestPass()),
    );

    // Any non-error event resets the "stuck" timer.
    this.unsubscribers.push(
      collector.on('*', (evt) => {
        if (evt.type !== 'error_encountered') {
          this.resetStuckTimer();
        }
      }),
    );

    console.log('[PatternDetector] Started');
  }

  /** Unsubscribe all listeners and stop detection. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
      this.stuckTimer = null;
    }

    console.log('[PatternDetector] Stopped');
  }

  /** Return all active (non-dismissed) alerts. */
  getActiveAlerts(): LoopAlert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.dismissed);
  }

  /** Return all alerts, including dismissed ones. */
  getAllAlerts(): LoopAlert[] {
    return Array.from(this.alerts.values());
  }

  /** Dismiss an alert by ID. */
  dismissAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.dismissed = true;
    }
  }

  /** Clear all alerts and reset internal buffers. */
  reset(): void {
    this.alerts.clear();
    this.errorBuffer.clear();
    this.fileModifyBuffer.clear();
    this.buildBuffer.clear();
    this.testBuffer.clear();
    this.consecutiveBuildFails = 0;
    this.consecutiveTestFails = 0;
    this.lastErrorTime = null;
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
      this.stuckTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  private onError(evt: ActivityEvent): void {
    this.errorBuffer.push(evt);
    this.lastErrorTime = evt.timestamp.getTime();
    this.startStuckTimer();
    this.checkRepeatedErrors();
  }

  private onFileModify(evt: ActivityEvent): void {
    this.fileModifyBuffer.push(evt);
    this.checkFileThrashing();
  }

  private onBuildFail(evt: ActivityEvent): void {
    this.buildBuffer.push(evt);
    this.consecutiveBuildFails += 1;
    this.checkBuildLoop();
  }

  private onBuildSuccess(): void {
    this.consecutiveBuildFails = 0;
  }

  private onTestFail(evt: ActivityEvent): void {
    this.testBuffer.push(evt);
    this.consecutiveTestFails += 1;
    this.checkTestLoop();
  }

  private onTestPass(): void {
    this.consecutiveTestFails = 0;
  }

  // ---------------------------------------------------------------------------
  // Detection logic
  // ---------------------------------------------------------------------------

  /** Check if the same normalized error has appeared 3+ times within 5 minutes. */
  private checkRepeatedErrors(): void {
    const recent = this.errorBuffer.since(
      ERROR_WINDOW_MS,
      (e) => e.timestamp.getTime(),
    );

    // Group by normalized error text.
    const groups = new Map<string, ActivityEvent[]>();
    for (const evt of recent) {
      const key = normalizeError(evt.rawOutput ?? '');
      if (!key) continue;
      const existing = groups.get(key) ?? [];
      existing.push(evt);
      groups.set(key, existing);
    }

    for (const [normalized, events] of groups) {
      if (events.length >= ERROR_REPEAT_THRESHOLD) {
        const truncated =
          normalized.length > 80 ? normalized.slice(0, 80) + '...' : normalized;
        this.emitAlert({
          type: 'repeated_error',
          severity: events.length >= 5 ? 'critical' : 'warning',
          message: `Claude has encountered the same error ${events.length} times in the last ${Math.round(ERROR_WINDOW_MS / 60000)} minutes: "${truncated}"`,
          suggestion:
            'Consider interrupting and providing more context about the expected behavior, or try a different approach entirely.',
          occurrences: events.length,
          pattern: normalized,
        });
      }
    }
  }

  /** Check if the same file has been modified 3+ times within 2 minutes. */
  private checkFileThrashing(): void {
    const recent = this.fileModifyBuffer.since(
      FILE_THRASH_WINDOW_MS,
      (e) => e.timestamp.getTime(),
    );

    // Group by file path.
    const groups = new Map<string, number>();
    for (const evt of recent) {
      const filePath = (evt.data?.path as string) ?? '';
      if (!filePath) continue;
      groups.set(filePath, (groups.get(filePath) ?? 0) + 1);
    }

    for (const [filePath, count] of groups) {
      if (count >= FILE_THRASH_THRESHOLD) {
        this.emitAlert({
          type: 'file_thrashing',
          severity: count >= 5 ? 'critical' : 'warning',
          message: `Claude has modified "${filePath}" ${count} times in the last ${Math.round(FILE_THRASH_WINDOW_MS / 60000)} minutes.`,
          suggestion:
            'Claude may be undoing and redoing changes. Consider interrupting to clarify the desired outcome for this file.',
          occurrences: count,
          pattern: filePath,
        });
      }
    }
  }

  /** Check if builds have failed 3+ times consecutively. */
  private checkBuildLoop(): void {
    if (this.consecutiveBuildFails >= BUILD_LOOP_THRESHOLD) {
      this.emitAlert({
        type: 'build_loop',
        severity: this.consecutiveBuildFails >= 5 ? 'critical' : 'warning',
        message: `Build has failed ${this.consecutiveBuildFails} times in a row without a successful build.`,
        suggestion:
          'Claude may be stuck in a build-fix loop. Consider interrupting and reviewing the build errors together, or asking Claude to take a different approach.',
        occurrences: this.consecutiveBuildFails,
        pattern: 'consecutive_build_fail',
      });
    }
  }

  /** Check if tests have failed 3+ times consecutively. */
  private checkTestLoop(): void {
    if (this.consecutiveTestFails >= TEST_LOOP_THRESHOLD) {
      this.emitAlert({
        type: 'test_loop',
        severity: this.consecutiveTestFails >= 5 ? 'critical' : 'warning',
        message: `Tests have failed ${this.consecutiveTestFails} times in a row without passing.`,
        suggestion:
          'Claude may be stuck in a test-fix loop. Consider interrupting to discuss the test expectations or re-examine the failing test.',
        occurrences: this.consecutiveTestFails,
        pattern: 'consecutive_test_fail',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Stuck detection
  // ---------------------------------------------------------------------------

  /** Start (or restart) the stuck timer after an error event. */
  private startStuckTimer(): void {
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
    }
    this.stuckTimer = setTimeout(() => {
      this.stuckTimer = null;
      this.emitAlert({
        type: 'stuck_after_error',
        severity: 'warning',
        message: `Claude has been idle for over ${Math.round(STUCK_TIMEOUT_MS / 1000)} seconds after encountering an error.`,
        suggestion:
          'Claude may be stuck or waiting. Consider sending a follow-up message with additional context or asking what the issue is.',
        occurrences: 1,
        pattern: 'idle_after_error',
      });
    }, STUCK_TIMEOUT_MS);
  }

  /** Reset the stuck timer (called when any non-error activity is detected). */
  private resetStuckTimer(): void {
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
      this.stuckTimer = null;
    }
    this.lastErrorTime = null;
  }

  // ---------------------------------------------------------------------------
  // Alert emission
  // ---------------------------------------------------------------------------

  /**
   * Create a LoopAlert and dispatch it as a window CustomEvent. Deduplicates
   * by type + pattern: if an active (non-dismissed) alert with the same
   * type and pattern already exists, it is updated rather than duplicated.
   */
  private emitAlert(params: {
    type: LoopAlertType;
    severity: 'warning' | 'critical';
    message: string;
    suggestion: string;
    occurrences: number;
    pattern: string;
  }): void {
    const dedupeKey = `${params.type}::${params.pattern}`;

    // Check for an existing active alert with the same signature.
    let existing: LoopAlert | undefined;
    for (const alert of this.alerts.values()) {
      if (!alert.dismissed && `${alert.type}::${alert.pattern}` === dedupeKey) {
        existing = alert;
        break;
      }
    }

    if (existing) {
      // Update the existing alert in place.
      existing.timestamp = new Date();
      existing.severity = params.severity;
      existing.message = params.message;
      existing.occurrences = params.occurrences;
      this.dispatchEvent(existing);
      return;
    }

    const alert: LoopAlert = {
      id: generateId(),
      timestamp: new Date(),
      type: params.type,
      severity: params.severity,
      message: params.message,
      suggestion: params.suggestion,
      occurrences: params.occurrences,
      pattern: params.pattern,
      dismissed: false,
    };

    this.alerts.set(alert.id, alert);
    this.dispatchEvent(alert);
  }

  /** Dispatch a `johnny5:loopDetected` CustomEvent on window. */
  private dispatchEvent(alert: LoopAlert): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('johnny5:loopDetected', { detail: alert }),
    );
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: PatternDetector | null = null;

export function getPatternDetector(): PatternDetector {
  if (!instance) {
    instance = new PatternDetector();
  }
  return instance;
}

export default PatternDetector;
