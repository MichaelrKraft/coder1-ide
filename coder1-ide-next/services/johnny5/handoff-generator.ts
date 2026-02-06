/**
 * Johnny5 Handoff Generator
 *
 * Client-side singleton service that monitors token usage and generates
 * structured handoff summaries when context is running low. Designed to
 * help users carry forward session context into a new conversation.
 *
 * Threshold levels:
 *   - 60%  -> no action
 *   - 75%  -> emit warning
 *   - 85%  -> emit critical
 *   - 95%  -> emit urgent
 *
 * Browser-only: no Node.js imports (fs, path, etc.).
 */

import { getActivityCollector } from './terminal-activity-collector';
import {
  getStoredActivityEvents,
  generateDailySummary,
} from './accomplishment-detector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HandoffSummary {
  id: string;
  timestamp: Date;
  tokenUsage: {
    used: number;
    limit: number;
    percentage: number;
  };
  accomplishments: string[];
  filesModified: string[];
  errorsEncountered: string[];
  currentTask: string;
  nextSteps: string[];
  handoffText: string;
}

export type WarningLevel = 'warning' | 'critical' | 'urgent';

interface TokenData {
  total: number;
  limit: number;
  usagePercentage: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const STORAGE_KEY_LAST_HANDOFF = 'johnny5_last_handoff';
const STORAGE_KEY_CONTEXT = 'johnny5_context_composition';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `handoff_${Date.now()}_${_idCounter}`;
}

/**
 * Read current token usage from localStorage or return null if unavailable.
 */
function readTokenData(): TokenData | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTEXT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const total = typeof parsed.total === 'number' ? parsed.total : 0;
    const limit = typeof parsed.limit === 'number' ? parsed.limit : 200_000;
    const usagePercentage =
      typeof parsed.usagePercentage === 'number'
        ? parsed.usagePercentage
        : limit > 0
          ? Math.round((total / limit) * 100)
          : 0;

    return { total, limit, usagePercentage };
  } catch {
    return null;
  }
}

/**
 * Determine warning level from a usage percentage.
 * Returns null when no warning is needed.
 */
function getWarningLevel(percentage: number): WarningLevel | null {
  if (percentage >= 95) return 'urgent';
  if (percentage >= 85) return 'critical';
  if (percentage >= 75) return 'warning';
  return null;
}

// ---------------------------------------------------------------------------
// Handoff Generator
// ---------------------------------------------------------------------------

class HandoffGenerator {
  private running = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastWarningLevel: WarningLevel | null = null;
  private latestTokenData: TokenData | null = null;
  private sessionStartTime: Date = new Date();

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Start monitoring token usage. */
  start(): void {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;
    this.sessionStartTime = new Date();
    this.lastWarningLevel = null;

    // Listen for token updates dispatched by ContextTab or ContextBudgetMini.
    window.addEventListener('johnny5:tokenUpdate', this.handleTokenUpdate as EventListener);

    // Poll localStorage on an interval as a fallback.
    this.pollTimer = setInterval(() => {
      this.checkTokenUsage();
    }, POLL_INTERVAL_MS);

    // Run an initial check.
    this.checkTokenUsage();

    console.log('[HandoffGenerator] Started');
  }

  /** Stop monitoring and clean up. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('johnny5:tokenUpdate', this.handleTokenUpdate as EventListener);
    }

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    console.log('[HandoffGenerator] Stopped');
  }

  /**
   * Generate a full handoff summary from current session data.
   * Can be called manually (via the HandoffBanner button) regardless of
   * whether a warning threshold has been crossed.
   */
  generateHandoff(): HandoffSummary {
    const tokenData = this.latestTokenData ?? readTokenData() ?? {
      total: 0,
      limit: 200_000,
      usagePercentage: 0,
    };

    // Gather accomplishments from stored activity events.
    const now = new Date();
    const events = getStoredActivityEvents(this.sessionStartTime, now);
    const summary = generateDailySummary(events, now.toISOString().split('T')[0]);

    const accomplishments = summary.accomplishments.map((a) => a.title);

    // Extract unique modified files from activity events.
    const filesSet = new Set<string>();
    for (const acc of summary.accomplishments) {
      for (const f of acc.files) {
        filesSet.add(f);
      }
    }
    const filesModified = Array.from(filesSet);

    // Collect error messages from the in-memory activity collector.
    const collector = getActivityCollector();
    const errorEvents = collector.getEvents({ type: 'error_encountered', limit: 20 });
    const errorsEncountered = errorEvents
      .map((e) => {
        const raw = e.rawOutput ?? '';
        return raw.length > 120 ? raw.slice(0, 120) + '...' : raw;
      })
      .filter(Boolean);

    // Deduplicate errors.
    const uniqueErrors = Array.from(new Set(errorsEncountered)).slice(0, 5);

    // Extract current task from the most recent user prompts.
    const promptEvents = collector.getEvents({ type: 'user_prompt', limit: 5 });
    const currentTask = promptEvents.length > 0
      ? String(promptEvents[promptEvents.length - 1].data.command ?? promptEvents[promptEvents.length - 1].data.text ?? 'Unknown task')
      : summary.leftOff?.description ?? 'No task detected';

    // Build next steps from context.
    const nextSteps = this.buildNextSteps(summary, uniqueErrors, currentTask);

    // Calculate session duration.
    const durationMin = Math.round((now.getTime() - this.sessionStartTime.getTime()) / 60_000);
    const durationStr = durationMin < 60
      ? `~${durationMin} min`
      : `~${Math.round(durationMin / 6) / 10} hours`;

    // Build the markdown handoff text.
    const handoffText = this.buildHandoffMarkdown({
      accomplishments,
      filesModified,
      currentTask,
      uniqueErrors,
      nextSteps,
      tokenData,
      durationStr,
      branch: summary.leftOff?.branch,
    });

    const handoff: HandoffSummary = {
      id: generateId(),
      timestamp: now,
      tokenUsage: {
        used: tokenData.total,
        limit: tokenData.limit,
        percentage: tokenData.usagePercentage,
      },
      accomplishments,
      filesModified,
      errorsEncountered: uniqueErrors,
      currentTask,
      nextSteps,
      handoffText,
    };

    // Persist to localStorage.
    this.saveLastHandoff(handoff);

    return handoff;
  }

  /** Retrieve the last saved handoff from localStorage, if any. */
  getLastHandoff(): HandoffSummary | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LAST_HANDOFF);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      } as HandoffSummary;
    } catch {
      return null;
    }
  }

  /** Return the current warning level (or null if below 75%). */
  getCurrentWarningLevel(): WarningLevel | null {
    return this.lastWarningLevel;
  }

  // -----------------------------------------------------------------------
  // Internal: event handling
  // -----------------------------------------------------------------------

  private handleTokenUpdate = (event: Event): void => {
    const detail = (event as CustomEvent<TokenData>).detail;
    if (!detail) return;

    this.latestTokenData = detail;
    this.evaluateThreshold(detail.usagePercentage);
  };

  private checkTokenUsage(): void {
    const data = readTokenData();
    if (!data) return;

    this.latestTokenData = data;
    this.evaluateThreshold(data.usagePercentage);
  }

  /**
   * Compare the current percentage against thresholds and emit a CustomEvent
   * only when a new (higher) threshold is crossed.
   */
  private evaluateThreshold(percentage: number): void {
    const level = getWarningLevel(percentage);
    if (!level) {
      // Below 75% -- reset so warnings can re-fire if usage goes up again.
      this.lastWarningLevel = null;
      return;
    }

    // Determine severity order for comparison.
    const order: Record<WarningLevel, number> = {
      warning: 1,
      critical: 2,
      urgent: 3,
    };

    const currentOrder = order[level];
    const lastOrder = this.lastWarningLevel ? order[this.lastWarningLevel] : 0;

    if (currentOrder > lastOrder) {
      this.lastWarningLevel = level;
      this.emitWarning(level, percentage);
    }
  }

  private emitWarning(level: WarningLevel, percentage: number): void {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('johnny5:contextWarning', {
        detail: { level, percentage },
      }),
    );
  }

  // -----------------------------------------------------------------------
  // Internal: handoff building
  // -----------------------------------------------------------------------

  private buildNextSteps(
    summary: ReturnType<typeof generateDailySummary>,
    errors: string[],
    currentTask: string,
  ): string[] {
    const steps: string[] = [];

    if (currentTask && currentTask !== 'No task detected') {
      steps.push(`Continue working on: ${currentTask}`);
    }

    if (errors.length > 0) {
      steps.push('Resolve remaining errors from the previous session');
    }

    if (summary.leftOff?.branch) {
      steps.push(`Check branch '${summary.leftOff.branch}' for uncommitted changes`);
    }

    if (summary.totalCommits > 0) {
      steps.push('Review and push pending commits if not already pushed');
    }

    // Always add a generic final step.
    if (steps.length === 0) {
      steps.push('Start a new task or review codebase for next priorities');
    }

    return steps;
  }

  private buildHandoffMarkdown(params: {
    accomplishments: string[];
    filesModified: string[];
    currentTask: string;
    uniqueErrors: string[];
    nextSteps: string[];
    tokenData: TokenData;
    durationStr: string;
    branch?: string;
  }): string {
    const {
      accomplishments,
      filesModified,
      currentTask,
      uniqueErrors,
      nextSteps,
      tokenData,
      durationStr,
      branch,
    } = params;

    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const lines: string[] = [];

    lines.push(`# Session Handoff - ${dateStr}`);
    lines.push('');

    // What Was Done
    lines.push('## What Was Done');
    if (accomplishments.length > 0) {
      for (const a of accomplishments) {
        lines.push(`- ${a}`);
      }
    } else {
      lines.push('- No major accomplishments detected yet');
    }
    lines.push('');

    // Files Modified
    lines.push('## Files Modified');
    if (filesModified.length > 0) {
      for (const f of filesModified.slice(0, 15)) {
        lines.push(`- ${f}`);
      }
      if (filesModified.length > 15) {
        lines.push(`- ... and ${filesModified.length - 15} more`);
      }
    } else {
      lines.push('- No file changes tracked');
    }
    lines.push('');

    // Current Task
    lines.push('## Current Task');
    lines.push(currentTask);
    lines.push('');

    // Key Errors Encountered
    if (uniqueErrors.length > 0) {
      lines.push('## Key Errors Encountered');
      for (const err of uniqueErrors) {
        lines.push(`- ${err}`);
      }
      lines.push('');
    }

    // Suggested Next Steps
    lines.push('## Suggested Next Steps');
    for (let i = 0; i < nextSteps.length; i++) {
      lines.push(`${i + 1}. ${nextSteps[i]}`);
    }
    lines.push('');

    // Context metadata
    const formatTokens = (n: number): string => {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
      return String(n);
    };

    lines.push('## Context');
    lines.push(
      `- Tokens used: ${formatTokens(tokenData.total)}/${formatTokens(tokenData.limit)} (${tokenData.usagePercentage}%)`,
    );
    lines.push(`- Session duration: ${durationStr}`);
    if (branch) {
      lines.push(`- Branch: ${branch}`);
    }

    return lines.join('\n');
  }

  // -----------------------------------------------------------------------
  // Internal: persistence
  // -----------------------------------------------------------------------

  private saveLastHandoff(handoff: HandoffSummary): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY_LAST_HANDOFF,
        JSON.stringify({
          ...handoff,
          timestamp: handoff.timestamp.toISOString(),
        }),
      );
    } catch {
      // localStorage quota exceeded -- silently skip.
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: HandoffGenerator | null = null;

export function getHandoffGenerator(): HandoffGenerator {
  if (!instance) {
    instance = new HandoffGenerator();
  }
  return instance;
}

export default HandoffGenerator;
