/**
 * Johnny5 Smart Session Coach
 *
 * Client-side singleton service that monitors session patterns and provides
 * helpful nudges. Subscribes to TerminalActivityCollector events and checks
 * for common anti-patterns: long sessions without commits, high context usage,
 * idle after errors, rapid file changes (scope creep), and exploration without
 * action (needs plan).
 *
 * Emits `johnny5:coachTip` CustomEvents on `window`. Maximum one tip per
 * 5 minutes. Respects per-type dismiss preferences via localStorage.
 *
 * Browser-only: no Node.js imports (fs, path, child_process, etc.).
 */

import { getActivityCollector } from './terminal-activity-collector';
import type { ActivityEvent } from './terminal-activity-collector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CoachTipType =
  | 'long_session'
  | 'high_context'
  | 'idle_after_error'
  | 'scope_creep'
  | 'needs_plan';

export interface CoachTip {
  type: CoachTipType;
  message: string;
  action: string;
  actionLabel: string;
  actionPayload?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum time between any two coaching tips (ms). */
const COACH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/** Interval at which periodic checks run (ms). */
const CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

/** Long session threshold: minutes of activity without a git commit. */
const LONG_SESSION_MINUTES = 8;

/** Token usage percentage threshold for the high_context tip. */
const HIGH_CONTEXT_THRESHOLD = 70;

/** Time after an error with no activity before idle_after_error tip (ms). */
const IDLE_AFTER_ERROR_MS = 2 * 60 * 1000; // 2 minutes

/** Number of distinct files modified within the scope creep window. */
const SCOPE_CREEP_FILE_THRESHOLD = 10;
/** Time window for scope creep detection (ms). */
const SCOPE_CREEP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Minutes of session before needs_plan tip can trigger. */
const NEEDS_PLAN_SESSION_MINUTES = 5;
/** Minimum file reads before needs_plan triggers. */
const NEEDS_PLAN_READ_THRESHOLD = 5;

/** localStorage key for permanently dismissed tip types. */
const DISMISSED_STORAGE_KEY = 'johnny5_coach_dismissed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `coach_${Date.now()}_${_idCounter}`;
}

// ---------------------------------------------------------------------------
// Session Coach
// ---------------------------------------------------------------------------

class SessionCoach {
  private unsubscribers: Array<() => void> = [];
  private running = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  /** Timestamp of the last tip emitted (for cooldown enforcement). */
  private lastTipTime = 0;

  /** Set of tip types the user has permanently dismissed. */
  private dismissedTypes: Set<CoachTipType> = new Set();

  /** Timestamp of the last git commit observed. */
  private lastCommitTime = 0;

  /** Timestamp of the session start (when start() is called). */
  private sessionStartTime = 0;

  /** Timestamp of the last error_encountered event. */
  private lastErrorTime = 0;

  /** Timer for idle-after-error detection. */
  private idleErrorTimer: ReturnType<typeof setTimeout> | null = null;

  /** Recent file modify/create events for scope creep detection. */
  private recentFileEvents: Array<{ path: string; time: number }> = [];

  /** Count of file reads (file events from collector without modify). */
  private fileReadCount = 0;
  /** Count of file modifications. */
  private fileModifyCount = 0;

  /** Listener for the token update event. */
  private tokenUpdateHandler: ((e: Event) => void) | null = null;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Begin monitoring session patterns. */
  start(): void {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;
    this.sessionStartTime = Date.now();
    this.lastCommitTime = Date.now(); // Assume clean slate at session start.

    this.loadDismissedTypes();

    const collector = getActivityCollector();

    // Track git commits.
    this.unsubscribers.push(
      collector.on('git_commit', () => {
        this.lastCommitTime = Date.now();
      }),
    );

    // Track errors for idle-after-error detection.
    this.unsubscribers.push(
      collector.on('error_encountered', () => {
        this.lastErrorTime = Date.now();
        this.startIdleErrorTimer();
      }),
    );

    // Any non-error activity resets the idle-after-error timer.
    this.unsubscribers.push(
      collector.on('*', (evt: ActivityEvent) => {
        if (evt.type !== 'error_encountered') {
          this.clearIdleErrorTimer();
        }

        // Track file events for scope creep and needs_plan.
        if (evt.type === 'file_modify' || evt.type === 'file_create') {
          const filePath = (evt.data?.path as string) ?? `unknown_${generateId()}`;
          this.recentFileEvents.push({ path: filePath, time: Date.now() });
          this.fileModifyCount += 1;

          // Prune old file events outside the scope creep window.
          const cutoff = Date.now() - SCOPE_CREEP_WINDOW_MS;
          this.recentFileEvents = this.recentFileEvents.filter((e) => e.time >= cutoff);

          // Check scope creep on each file event.
          this.checkScopeCreep();
        }

        // Count file reads (claude_active often accompanies file reading).
        // Use file_create/file_modify to track "read" is a proxy: events
        // from the collector that aren't modifies count as exploration.
        if (evt.type === 'claude_active' || evt.type === 'claude_thinking') {
          // These indicate Claude is reading/exploring; increment read counter.
          this.fileReadCount += 1;
        }
      }),
    );

    // Listen for token usage updates (from ContextBudgetMini or other sources).
    this.tokenUpdateHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ percentage: number }>).detail;
      if (detail && typeof detail.percentage === 'number') {
        this.checkHighContext(detail.percentage);
      }
    };
    window.addEventListener('johnny5:tokenUpdate', this.tokenUpdateHandler);

    // Start periodic checks for long_session and needs_plan.
    this.checkInterval = setInterval(() => {
      this.periodicCheck();
    }, CHECK_INTERVAL_MS);

    console.log('[SessionCoach] Started');
  }

  /** Stop monitoring and clean up all listeners. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.clearIdleErrorTimer();

    if (this.tokenUpdateHandler && typeof window !== 'undefined') {
      window.removeEventListener('johnny5:tokenUpdate', this.tokenUpdateHandler);
      this.tokenUpdateHandler = null;
    }

    console.log('[SessionCoach] Stopped');
  }

  /** Permanently dismiss a tip type so it never shows again. */
  dismissType(type: CoachTipType): void {
    this.dismissedTypes.add(type);
    this.saveDismissedTypes();
  }

  /** Get the set of permanently dismissed tip types. */
  getDismissedTypes(): Set<CoachTipType> {
    return new Set(this.dismissedTypes);
  }

  /** Reset all dismiss preferences. */
  resetDismissals(): void {
    this.dismissedTypes.clear();
    this.saveDismissedTypes();
  }

  // -----------------------------------------------------------------------
  // Detection: long_session
  // -----------------------------------------------------------------------

  /** Called periodically. Checks if enough time has passed since last commit. */
  private checkLongSession(): void {
    const minutesSinceCommit = (Date.now() - this.lastCommitTime) / (60 * 1000);

    if (minutesSinceCommit >= LONG_SESSION_MINUTES) {
      const rounded = Math.round(minutesSinceCommit);
      this.emitTip({
        type: 'long_session',
        message: `You've been working for ${rounded} minutes without saving. Consider committing your progress.`,
        action: 'johnny5:sendToTerminal',
        actionLabel: 'Run git commit',
        actionPayload: 'git add -A && git commit -m "WIP: checkpoint"',
      });
    }
  }

  // -----------------------------------------------------------------------
  // Detection: high_context
  // -----------------------------------------------------------------------

  /** Called when a token update event fires. */
  private checkHighContext(percentage: number): void {
    if (percentage >= HIGH_CONTEXT_THRESHOLD) {
      this.emitTip({
        type: 'high_context',
        message: `Context window is ${Math.round(percentage)}% full. Running /compact can reclaim space.`,
        action: 'johnny5:sendToTerminal',
        actionLabel: 'Run /compact',
        actionPayload: '/compact',
      });
    }
  }

  // -----------------------------------------------------------------------
  // Detection: idle_after_error
  // -----------------------------------------------------------------------

  /** Start the idle-after-error timer when an error occurs. */
  private startIdleErrorTimer(): void {
    this.clearIdleErrorTimer();
    this.idleErrorTimer = setTimeout(() => {
      this.idleErrorTimer = null;
      if (this.lastErrorTime > 0) {
        this.emitTip({
          type: 'idle_after_error',
          message: 'Stuck on an error? Try describing the problem differently or providing more context.',
          action: 'johnny5:openTemplates',
          actionLabel: 'Open Templates',
        });
      }
    }, IDLE_AFTER_ERROR_MS);
  }

  /** Clear the idle-after-error timer (called when non-error activity resumes). */
  private clearIdleErrorTimer(): void {
    if (this.idleErrorTimer) {
      clearTimeout(this.idleErrorTimer);
      this.idleErrorTimer = null;
    }
    this.lastErrorTime = 0;
  }

  // -----------------------------------------------------------------------
  // Detection: scope_creep
  // -----------------------------------------------------------------------

  /** Check if too many distinct files have been modified within the window. */
  private checkScopeCreep(): void {
    const cutoff = Date.now() - SCOPE_CREEP_WINDOW_MS;
    const recentInWindow = this.recentFileEvents.filter((e) => e.time >= cutoff);
    const distinctFiles = new Set(recentInWindow.map((e) => e.path));

    if (distinctFiles.size >= SCOPE_CREEP_FILE_THRESHOLD) {
      this.emitTip({
        type: 'scope_creep',
        message: `You're touching many files (${distinctFiles.size} in the last 5 minutes). Consider focusing on one area at a time to avoid scope creep.`,
        action: 'johnny5:openWorkflows',
        actionLabel: 'Create Workflow',
      });
    }
  }

  // -----------------------------------------------------------------------
  // Detection: needs_plan
  // -----------------------------------------------------------------------

  /** Called periodically. Checks for lots of exploration without action. */
  private checkNeedsPlan(): void {
    const sessionMinutes = (Date.now() - this.sessionStartTime) / (60 * 1000);
    if (sessionMinutes < NEEDS_PLAN_SESSION_MINUTES) return;

    // Lots of reading/exploration activity but no modifications.
    if (this.fileReadCount >= NEEDS_PLAN_READ_THRESHOLD && this.fileModifyCount === 0) {
      this.emitTip({
        type: 'needs_plan',
        message: 'Lots of exploration so far. Using /plan mode first might help structure this task.',
        action: 'johnny5:sendToTerminal',
        actionLabel: 'Use Plan Mode',
        actionPayload: '/plan',
      });
    }
  }

  // -----------------------------------------------------------------------
  // Periodic check runner
  // -----------------------------------------------------------------------

  /** Runs every CHECK_INTERVAL_MS. Evaluates time-based conditions. */
  private periodicCheck(): void {
    this.checkLongSession();
    this.checkNeedsPlan();

    // Also check token percentage from localStorage as a fallback.
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('johnny5_token_percentage');
        if (raw) {
          const pct = parseFloat(raw);
          if (!isNaN(pct)) {
            this.checkHighContext(pct);
          }
        }
      } catch {
        // Ignore.
      }
    }
  }

  // -----------------------------------------------------------------------
  // Tip emission
  // -----------------------------------------------------------------------

  /**
   * Emit a coaching tip, subject to cooldown and dismiss-preference checks.
   * Returns true if the tip was emitted, false if suppressed.
   */
  private emitTip(tip: CoachTip): boolean {
    if (typeof window === 'undefined') return false;

    // Check if this tip type is permanently dismissed.
    if (this.dismissedTypes.has(tip.type)) return false;

    // Enforce cooldown.
    const now = Date.now();
    if (now - this.lastTipTime < COACH_COOLDOWN_MS) return false;

    this.lastTipTime = now;

    window.dispatchEvent(
      new CustomEvent('johnny5:coachTip', { detail: tip }),
    );

    return true;
  }

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  /** Load permanently dismissed types from localStorage. */
  private loadDismissedTypes(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        this.dismissedTypes = new Set(parsed as CoachTipType[]);
      }
    } catch {
      this.dismissedTypes = new Set();
    }
  }

  /** Save permanently dismissed types to localStorage. */
  private saveDismissedTypes(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        DISMISSED_STORAGE_KEY,
        JSON.stringify(Array.from(this.dismissedTypes)),
      );
    } catch {
      // Storage full or unavailable -- ignore silently.
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: SessionCoach | null = null;

export function getSessionCoach(): SessionCoach {
  if (!instance) {
    instance = new SessionCoach();
  }
  return instance;
}

export default SessionCoach;
