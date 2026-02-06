/**
 * Johnny5 Terminal Activity Collector
 *
 * Client-side singleton service that listens to terminalOutput CustomEvents
 * dispatched by Terminal.tsx, classifies terminal output into structured
 * activity events, and stores them in a ring buffer with localStorage persistence.
 *
 * Browser-only: no Node.js imports (fs, path, etc.).
 * Terminal.tsx dispatches: window.dispatchEvent(new CustomEvent('terminalOutput', { detail: { output: data } }))
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActivityEventType =
  | 'session_start'
  | 'session_end'
  | 'git_commit'
  | 'git_push'
  | 'git_branch'
  | 'git_pr'
  | 'file_create'
  | 'file_modify'
  | 'file_delete'
  | 'error_encountered'
  | 'error_resolved'
  | 'test_run'
  | 'test_pass'
  | 'test_fail'
  | 'build_start'
  | 'build_success'
  | 'build_fail'
  | 'install_packages'
  | 'claude_active'
  | 'claude_thinking'
  | 'claude_done'
  | 'user_prompt'
  | 'destructive_action'
  | 'unknown';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: ActivityEventType;
  data: Record<string, unknown>;
  rawOutput?: string;
  sessionId?: string;
}

export interface CollectorStats {
  totalEvents: number;
  sessionStart: Date | null;
  lastEventTime: Date | null;
  eventsByType: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Classification patterns  (order matters -- first match wins)
// ---------------------------------------------------------------------------

interface ClassificationRule {
  pattern: RegExp;
  type: ActivityEventType;
  /** Extract structured data from the match. Receives the RegExp match array. */
  extract?: (match: RegExpMatchArray, line: string) => Record<string, unknown>;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // -- Claude activity --
  {
    pattern: /claude|Claude conversation mode|Starting Claude/i,
    type: 'claude_active',
  },
  {
    pattern: /Thinking\.\.\.|[\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F]/,
    type: 'claude_thinking',
  },

  // -- Git events --
  {
    pattern: /git commit.*-m\s+["'](.+?)["']/i,
    type: 'git_commit',
    extract: (match) => ({ message: match[1] ?? '' }),
  },
  {
    pattern: /git push/i,
    type: 'git_push',
  },
  {
    pattern: /git checkout|git switch|git branch/i,
    type: 'git_branch',
  },
  {
    pattern: /gh pr create|pull request/i,
    type: 'git_pr',
  },

  // -- Test events --
  {
    pattern: /(\d+)\s+(passing|passed)/i,
    type: 'test_pass',
    extract: (match) => ({ count: Number(match[1]) }),
  },
  {
    pattern: /(\d+)\s+(failing|failed)/i,
    type: 'test_fail',
    extract: (match) => ({ count: Number(match[1]) }),
  },
  {
    pattern: /npm test|jest|vitest|pytest|mocha/i,
    type: 'test_run',
  },

  // -- Build events --
  {
    pattern: /npm run build|next build|webpack|tsc\b/i,
    type: 'build_start',
  },
  {
    pattern: /Build succeeded|Compiled successfully|✓ Compiled/i,
    type: 'build_success',
  },
  {
    pattern: /Build failed|Compilation error|ERROR in/i,
    type: 'build_fail',
  },

  // -- File events (from Claude's tool use output) --
  {
    pattern: /(?:Created|Writing|Wrote)\s+(?:file\s+)?[`"']?(\S+\.\w+)/i,
    type: 'file_create',
    extract: (match) => ({ path: match[1] ?? '' }),
  },
  {
    pattern: /(?:Edited|Modified|Updated)\s+(?:file\s+)?[`"']?(\S+\.\w+)/i,
    type: 'file_modify',
    extract: (match) => ({ path: match[1] ?? '' }),
  },
  {
    pattern: /(?:Deleted|Removed)\s+(?:file\s+)?[`"']?(\S+\.\w+)/i,
    type: 'file_delete',
    extract: (match) => ({ path: match[1] ?? '' }),
  },

  // -- Package install --
  {
    pattern: /npm install|yarn add|pip install|pnpm add/i,
    type: 'install_packages',
  },

  // -- Destructive actions (checked before generic error so force-push is caught here) --
  {
    pattern: /git push --force|git push -f/i,
    type: 'destructive_action',
    extract: () => ({ severity: 'critical', action: 'force_push' }),
  },
  {
    pattern: /rm -rf|rm -r/i,
    type: 'destructive_action',
    extract: () => ({ severity: 'warning', action: 'recursive_delete' }),
  },
  {
    pattern: /git reset --hard/i,
    type: 'destructive_action',
    extract: () => ({ severity: 'warning', action: 'hard_reset' }),
  },
  {
    pattern: /DROP TABLE|DROP DATABASE/i,
    type: 'destructive_action',
    extract: () => ({ severity: 'critical', action: 'drop_db' }),
  },

  // -- Error detection --
  {
    pattern: /error|Error|ERROR|ENOENT|TypeError|SyntaxError|ReferenceError/i,
    type: 'error_encountered',
  },

  // -- User prompt detection (shell prompt characters) --
  {
    pattern: /^[❯$%>]\s+(.+)/,
    type: 'user_prompt',
    extract: (match) => ({ command: match[1]?.trim() ?? '' }),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique ID. Uses crypto.randomUUID when available, falls back to a counter. */
let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `evt_${Date.now()}_${_idCounter}`;
}

/** Strip ANSI escape codes from a string. Matches the pattern used in Terminal.tsx. */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

// ---------------------------------------------------------------------------
// Collector Service
// ---------------------------------------------------------------------------

const MAX_MEMORY_EVENTS = 1000;
const MAX_STORED_EVENTS_PER_DAY = 5000;
const DEBOUNCE_MS = 200;
const BATCH_FLUSH_MS = 5000;
const STORAGE_KEY_PREFIX = 'johnny5_activity_';

class TerminalActivityCollector {
  private events: ActivityEvent[] = [];
  private isListening = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private outputBuffer = '';
  private stats: CollectorStats;
  private listeners: Map<string, Set<(event: ActivityEvent) => void>> = new Map();
  private batchBuffer: ActivityEvent[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.stats = {
      totalEvents: 0,
      sessionStart: null,
      lastEventTime: null,
      eventsByType: {},
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Start listening to terminal output events. */
  start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    window.addEventListener('terminalOutput', this.handleTerminalOutput as EventListener);
    this.isListening = true;
    this.stats.sessionStart = new Date();
    console.log('[ActivityCollector] Started listening');
  }

  /** Stop listening and flush any pending data. */
  stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('terminalOutput', this.handleTerminalOutput as EventListener);
    this.isListening = false;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.batchTimer) clearTimeout(this.batchTimer);
    // Process any remaining buffer content before stopping.
    this.processBuffer();
    this.flushBatch();
    console.log('[ActivityCollector] Stopped');
  }

  /** Subscribe to events by type. Use `'*'` for all events. Returns an unsubscribe function. */
  on(type: string, callback: (event: ActivityEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /** Get recent in-memory events, optionally filtered. */
  getEvents(options?: {
    type?: ActivityEventType;
    limit?: number;
    since?: Date;
  }): ActivityEvent[] {
    let filtered = [...this.events];
    if (options?.type) {
      filtered = filtered.filter((e) => e.type === options.type);
    }
    if (options?.since) {
      const since = options.since;
      filtered = filtered.filter((e) => e.timestamp >= since);
    }
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }
    return filtered;
  }

  /** Retrieve persisted events from localStorage for a date range. */
  getStoredEvents(startDate: Date, endDate: Date): ActivityEvent[] {
    if (typeof localStorage === 'undefined') return [];

    const events: ActivityEvent[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const key = `${STORAGE_KEY_PREFIX}${current.toISOString().split('T')[0]}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const stored: Array<Record<string, unknown>> = JSON.parse(raw);
          for (const entry of stored) {
            events.push({
              ...entry,
              timestamp: new Date(entry.timestamp as string),
            } as unknown as ActivityEvent);
          }
        }
      } catch {
        // Corrupted entry -- skip silently.
      }
      current.setDate(current.getDate() + 1);
    }

    return events;
  }

  /** Get a snapshot of collector statistics. */
  getStats(): CollectorStats {
    return { ...this.stats };
  }

  /** Clear all in-memory events and reset counters (preserves sessionStart). */
  clear(): void {
    this.events = [];
    this.batchBuffer = [];
    this.stats = {
      totalEvents: 0,
      sessionStart: this.stats.sessionStart,
      lastEventTime: null,
      eventsByType: {},
    };
  }

  // -----------------------------------------------------------------------
  // Internal: event handling
  // -----------------------------------------------------------------------

  /** Handle incoming terminalOutput CustomEvent. Debounced to 200ms. */
  private handleTerminalOutput = (event: Event): void => {
    const customEvent = event as CustomEvent<{ output: string }>;
    const raw = customEvent.detail?.output;
    if (!raw) return;

    this.outputBuffer += raw;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processBuffer();
    }, DEBOUNCE_MS);
  };

  /** Process the accumulated output buffer. */
  private processBuffer(): void {
    if (!this.outputBuffer) return;

    const cleaned = stripAnsi(this.outputBuffer);
    this.outputBuffer = '';

    // Split into lines and classify each meaningful one.
    const lines = cleaned.split('\n').filter((l) => l.trim().length > 2);

    for (const line of lines) {
      const evt = this.classifyLine(line.trim());
      if (evt) {
        this.addEvent(evt);
      }
    }
  }

  /** Classify a single line of terminal output. Returns null for noise / unclassifiable lines. */
  private classifyLine(line: string): ActivityEvent | null {
    for (const rule of CLASSIFICATION_RULES) {
      const match = line.match(rule.pattern);
      if (match) {
        const data: Record<string, unknown> = rule.extract
          ? rule.extract(match, line)
          : {};

        return {
          id: generateId(),
          timestamp: new Date(),
          type: rule.type,
          data,
          rawOutput: line.length > 500 ? line.slice(0, 500) : line,
        };
      }
    }

    // No pattern matched -- return null (skip noise).
    return null;
  }

  // -----------------------------------------------------------------------
  // Internal: storage
  // -----------------------------------------------------------------------

  /** Add an event to the ring buffer and notify listeners. */
  private addEvent(event: ActivityEvent): void {
    // Ring buffer eviction.
    if (this.events.length >= MAX_MEMORY_EVENTS) {
      this.events.shift();
    }
    this.events.push(event);

    // Update stats.
    this.stats.totalEvents += 1;
    this.stats.lastEventTime = event.timestamp;
    this.stats.eventsByType[event.type] =
      (this.stats.eventsByType[event.type] || 0) + 1;

    // Notify type-specific listeners.
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.warn('[ActivityCollector] Listener error:', err);
        }
      });
    }

    // Notify wildcard listeners.
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.warn('[ActivityCollector] Wildcard listener error:', err);
        }
      });
    }

    // Queue for localStorage persistence.
    this.batchBuffer.push(event);
    this.scheduleBatchFlush();
  }

  /** Schedule a batch flush to localStorage (every 5 seconds). */
  private scheduleBatchFlush(): void {
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => {
      this.flushBatch();
      this.batchTimer = null;
    }, BATCH_FLUSH_MS);
  }

  /** Flush the batch buffer to localStorage. */
  private flushBatch(): void {
    if (this.batchBuffer.length === 0) return;
    if (typeof localStorage === 'undefined') {
      this.batchBuffer = [];
      return;
    }

    try {
      const key = `${STORAGE_KEY_PREFIX}${new Date().toISOString().split('T')[0]}`;
      const existing: Array<Record<string, unknown>> = JSON.parse(
        localStorage.getItem(key) || '[]',
      );
      const serialized = this.batchBuffer.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      }));
      const combined = [...existing, ...serialized];
      // Cap per-day storage.
      const trimmed = combined.slice(-MAX_STORED_EVENTS_PER_DAY);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[ActivityCollector] Failed to persist batch:', e);
    }

    this.batchBuffer = [];
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: TerminalActivityCollector | null = null;

export function getActivityCollector(): TerminalActivityCollector {
  if (!instance) {
    instance = new TerminalActivityCollector();
  }
  return instance;
}

export default TerminalActivityCollector;
