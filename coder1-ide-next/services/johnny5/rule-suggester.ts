/**
 * Johnny5 Rule Suggester
 *
 * Client-side singleton service that watches for recurring error patterns
 * in terminal output and suggests CLAUDE.md rules to prevent them.
 *
 * Hooks into TerminalActivityCollector via `.on('error_encountered', ...)`.
 * When the same normalized error pattern appears 3+ times, it generates a
 * rule suggestion and dispatches a CustomEvent for the UI to display.
 *
 * Browser-only: no Node.js imports (fs, path, etc.).
 */

import { getActivityCollector, type ActivityEvent } from './terminal-activity-collector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RuleSuggestion {
  id: string;
  timestamp: Date;
  errorPattern: string;
  occurrences: number;
  suggestedRule: string;
  category: 'typescript' | 'runtime' | 'build' | 'test' | 'git' | 'general';
  confidence: 'low' | 'medium' | 'high';
  dismissed: boolean;
  applied: boolean;
}

interface TrackedPattern {
  normalized: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  rawSamples: string[];
  suggestionEmitted: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'johnny5_rule_suggestions';
const THRESHOLD = 3;
const MAX_SAMPLES = 5;
const MAX_STORED_SUGGESTIONS = 50;

// ---------------------------------------------------------------------------
// Error-to-Rule mapping
// ---------------------------------------------------------------------------

interface RuleMapping {
  pattern: RegExp;
  category: RuleSuggestion['category'];
  rule: string;
}

const RULE_MAPPINGS: RuleMapping[] = [
  {
    pattern: /cannot read properties? of (undefined|null)/i,
    category: 'runtime',
    rule: 'Always check for null/undefined before accessing object properties',
  },
  {
    pattern: /is not a function/i,
    category: 'runtime',
    rule: 'Verify that values are callable before invoking them. Check imports and variable types.',
  },
  {
    pattern: /module not found|cannot find module/i,
    category: 'build',
    rule: 'Verify import paths are correct and the module is installed before importing',
  },
  {
    pattern: /is not assignable to type/i,
    category: 'typescript',
    rule: 'Use TypeScript strict mode and check type compatibility before assignment',
  },
  {
    pattern: /property .+ does not exist on type/i,
    category: 'typescript',
    rule: 'Check that accessed properties exist on the type. Use optional chaining or type guards.',
  },
  {
    pattern: /unexpected token/i,
    category: 'build',
    rule: 'Check for syntax errors such as missing brackets, commas, or semicolons before saving',
  },
  {
    pattern: /eslint/i,
    category: 'build',
    rule: 'Run the linter before committing and fix all warnings. Consider adding an ESLint pre-commit hook.',
  },
  {
    pattern: /enoent|no such file or directory/i,
    category: 'runtime',
    rule: 'Verify file or directory exists before performing operations on it',
  },
  {
    pattern: /permission denied/i,
    category: 'runtime',
    rule: 'Check file permissions before read/write operations',
  },
  {
    pattern: /out of memory|heap/i,
    category: 'runtime',
    rule: 'Watch for memory usage. Avoid loading large datasets entirely into memory.',
  },
  {
    pattern: /timeout|timed out/i,
    category: 'runtime',
    rule: 'Add appropriate timeout handling and retry logic for async operations',
  },
  {
    pattern: /failed to compile/i,
    category: 'build',
    rule: 'Fix all compilation errors before proceeding. Check recent file changes for introduced issues.',
  },
  {
    pattern: /test .+ failed|assertion.+error/i,
    category: 'test',
    rule: 'Run tests after every change. Fix failing tests before moving to the next task.',
  },
  {
    pattern: /merge conflict/i,
    category: 'git',
    rule: 'Pull and rebase before pushing. Resolve merge conflicts in small batches.',
  },
  {
    pattern: /CORS|access-control-allow/i,
    category: 'runtime',
    rule: 'Configure CORS headers on the server. Verify allowed origins match the client domain.',
  },
];

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/** Strip line numbers, file paths, timestamps, and variable specifics to find the core pattern. */
function normalizeError(raw: string): string {
  let s = raw;
  // Strip ANSI codes (may still be present).
  s = s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // Strip file paths (Unix and Windows).
  s = s.replace(/(?:\/[\w.\-]+)+(?::\d+(?::\d+)?)?/g, '<path>');
  s = s.replace(/(?:[A-Z]:\\[\w.\-\\]+)+(?::\d+(?::\d+)?)?/g, '<path>');
  // Strip line:col references like (12:34) or line 12.
  s = s.replace(/\bline\s+\d+/gi, 'line <n>');
  s = s.replace(/\(\d+:\d+\)/g, '(<n>:<n>)');
  // Strip timestamps (ISO, common log formats).
  s = s.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[\w.:+-]*/g, '<time>');
  s = s.replace(/\d{2}:\d{2}:\d{2}/g, '<time>');
  // Strip hex addresses.
  s = s.replace(/0x[0-9a-fA-F]+/g, '<addr>');
  // Strip specific variable/property names in quotes to generalize.
  s = s.replace(/'[^']{30,}'/g, "'<value>'");
  s = s.replace(/"[^"]{30,}"/g, '"<value>"');
  // Collapse whitespace.
  s = s.replace(/\s+/g, ' ').trim();
  // Lowercase for consistent matching.
  return s.toLowerCase();
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Rule Suggester Service
// ---------------------------------------------------------------------------

class RuleSuggester {
  private patterns: Map<string, TrackedPattern> = new Map();
  private suggestions: RuleSuggestion[] = [];
  private unsubscribe: (() => void) | null = null;
  private started = false;

  /** Start listening to error events from the activity collector. */
  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.loadFromStorage();
    const collector = getActivityCollector();
    this.unsubscribe = collector.on('error_encountered', this.handleError);
    this.started = true;
  }

  /** Stop listening and persist state. */
  stop(): void {
    if (!this.started) return;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.started = false;
  }

  /** Get all suggestions (optionally filter undismissed). */
  getSuggestions(onlyActive = false): RuleSuggestion[] {
    if (onlyActive) {
      return this.suggestions.filter((s) => !s.dismissed && !s.applied);
    }
    return [...this.suggestions];
  }

  /** Mark a suggestion as dismissed. */
  dismiss(id: string): void {
    const suggestion = this.suggestions.find((s) => s.id === id);
    if (suggestion) {
      suggestion.dismissed = true;
      this.saveToStorage();
    }
  }

  /** Mark a suggestion as applied. */
  markApplied(id: string): void {
    const suggestion = this.suggestions.find((s) => s.id === id);
    if (suggestion) {
      suggestion.applied = true;
      this.saveToStorage();
    }
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private handleError = (event: ActivityEvent): void => {
    const raw = event.rawOutput ?? '';
    if (!raw || raw.length < 5) return;

    const normalized = normalizeError(raw);
    if (normalized.length < 5) return;

    const existing = this.patterns.get(normalized);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = Date.now();
      if (existing.rawSamples.length < MAX_SAMPLES) {
        existing.rawSamples.push(raw.slice(0, 200));
      }

      if (existing.count >= THRESHOLD && !existing.suggestionEmitted) {
        this.emitSuggestion(normalized, existing);
        existing.suggestionEmitted = true;
      } else if (existing.count > THRESHOLD && existing.count % 5 === 0) {
        // Re-emit with updated count every 5 additional occurrences.
        this.updateSuggestionCount(normalized, existing.count);
      }
    } else {
      this.patterns.set(normalized, {
        normalized,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        rawSamples: [raw.slice(0, 200)],
        suggestionEmitted: false,
      });
    }
  };

  private emitSuggestion(normalized: string, tracked: TrackedPattern): void {
    const { category, rule } = this.matchRule(normalized, tracked.rawSamples[0] ?? '');

    const suggestion: RuleSuggestion = {
      id: generateId(),
      timestamp: new Date(),
      errorPattern: normalized.slice(0, 120),
      occurrences: tracked.count,
      suggestedRule: rule,
      category,
      confidence: this.computeConfidence(tracked.count),
      dismissed: false,
      applied: false,
    };

    this.suggestions.push(suggestion);
    if (this.suggestions.length > MAX_STORED_SUGGESTIONS) {
      this.suggestions = this.suggestions.slice(-MAX_STORED_SUGGESTIONS);
    }
    this.saveToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('johnny5:ruleSuggestion', { detail: suggestion }),
      );
    }
  }

  private updateSuggestionCount(normalized: string, count: number): void {
    const existing = this.suggestions.find(
      (s) => s.errorPattern === normalized.slice(0, 120) && !s.dismissed && !s.applied,
    );
    if (existing) {
      existing.occurrences = count;
      existing.confidence = this.computeConfidence(count);
      this.saveToStorage();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('johnny5:ruleSuggestion', { detail: existing }),
        );
      }
    }
  }

  private matchRule(
    normalized: string,
    rawSample: string,
  ): { category: RuleSuggestion['category']; rule: string } {
    const combined = `${normalized} ${rawSample}`.toLowerCase();
    for (const mapping of RULE_MAPPINGS) {
      if (mapping.pattern.test(combined)) {
        return { category: mapping.category, rule: mapping.rule };
      }
    }
    // Fallback: generate a generic suggestion from the pattern.
    const short = normalized.length > 80 ? normalized.slice(0, 80) + '...' : normalized;
    return {
      category: 'general',
      rule: `Recurring error detected: "${short}". Consider adding a prevention rule to CLAUDE.md`,
    };
  }

  private computeConfidence(count: number): RuleSuggestion['confidence'] {
    if (count >= 10) return 'high';
    if (count >= 5) return 'medium';
    return 'low';
  }

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const serialized = this.suggestions.map((s) => ({
        ...s,
        timestamp: (s.timestamp as Date).toISOString(),
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
      const parsed: Array<Record<string, unknown>> = JSON.parse(raw);
      this.suggestions = parsed.map((entry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp as string),
      })) as unknown as RuleSuggestion[];
    } catch {
      // Corrupted data -- start fresh.
      this.suggestions = [];
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: RuleSuggester | null = null;

export function getRuleSuggester(): RuleSuggester {
  if (!instance) {
    instance = new RuleSuggester();
  }
  return instance;
}

export default RuleSuggester;
