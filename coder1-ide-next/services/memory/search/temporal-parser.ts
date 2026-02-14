/**
 * Johnny5 Memory Temporal Parser
 *
 * Parses natural language time references from user queries into date ranges.
 * Used by the memory search system to filter results by time period.
 *
 * Examples:
 *   "what did I do yesterday" -> { after: yesterday 00:00, before: yesterday 23:59:59 }
 *   "remember when I fixed the CORS bug last week" -> { after: last Monday, before: last Sunday }
 *   "N days ago" -> approximate range around that date
 *
 * No external dependencies -- pure regex-based parsing.
 */

// ============================================================================
// Types
// ============================================================================

/** A resolved date range extracted from a natural language time reference. */
export interface TemporalRange {
  /** Start of the time range (inclusive). Undefined means unbounded past. */
  after?: Date;
  /** End of the time range (inclusive). Undefined means up to now. */
  before?: Date;
  /** The original natural language phrase that was matched. */
  label: string;
  /** How confident the parser is in the resolved range. */
  confidence: 'exact' | 'approximate' | 'ambiguous';
}

// ============================================================================
// Constants
// ============================================================================

const MONTH_NAMES: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

// ============================================================================
// Helpers
// ============================================================================

/** Returns a new Date set to the start of the given date's day (00:00:00.000). */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns a new Date set to the end of the given date's day (23:59:59.999). */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Returns the start of the week (Monday) for the given date. */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // getDay() returns 0 for Sunday; shift so Monday = 0
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return startOfDay(d);
}

/** Returns the end of the week (Sunday 23:59:59) for the given date. */
function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

/** Returns the start of the month (1st, 00:00:00) for the given date. */
function startOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfDay(d);
}

/** Returns the end of the month (last day, 23:59:59) for the given date. */
function endOfMonth(date: Date): Date {
  // Day 0 of next month = last day of current month
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return endOfDay(d);
}

// ============================================================================
// Pattern definitions
// ============================================================================

interface TemporalPattern {
  regex: RegExp;
  resolve: (match: RegExpMatchArray, now: Date) => TemporalRange;
}

const PATTERNS: TemporalPattern[] = [
  // "today"
  {
    regex: /\btoday\b/i,
    resolve: (_match, now) => ({
      after: startOfDay(now),
      before: now,
      label: 'today',
      confidence: 'exact',
    }),
  },

  // "yesterday"
  {
    regex: /\byesterday\b/i,
    resolve: (_match, now) => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        after: startOfDay(yesterday),
        before: endOfDay(yesterday),
        label: 'yesterday',
        confidence: 'exact',
      };
    },
  },

  // "this week"
  {
    regex: /\bthis\s+week\b/i,
    resolve: (_match, now) => ({
      after: startOfWeek(now),
      before: now,
      label: 'this week',
      confidence: 'exact',
    }),
  },

  // "last week"
  {
    regex: /\blast\s+week\b/i,
    resolve: (_match, now) => {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return {
        after: startOfWeek(lastWeek),
        before: endOfWeek(lastWeek),
        label: 'last week',
        confidence: 'exact',
      };
    },
  },

  // "this month"
  {
    regex: /\bthis\s+month\b/i,
    resolve: (_match, now) => ({
      after: startOfMonth(now),
      before: now,
      label: 'this month',
      confidence: 'exact',
    }),
  },

  // "last month"
  {
    regex: /\blast\s+month\b/i,
    resolve: (_match, now) => {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        after: startOfMonth(lastMonth),
        before: endOfMonth(lastMonth),
        label: 'last month',
        confidence: 'exact',
      };
    },
  },

  // "in January", "in February", etc.
  {
    regex: new RegExp(
      `\\bin\\s+(${Object.keys(MONTH_NAMES).join('|')})\\b`,
      'i'
    ),
    resolve: (match, now) => {
      const monthName = match[1].toLowerCase();
      const monthIndex = MONTH_NAMES[monthName];
      // If the month hasn't occurred yet this year, assume last year
      let year = now.getFullYear();
      if (monthIndex > now.getMonth()) {
        year -= 1;
      }
      const target = new Date(year, monthIndex, 1);
      return {
        after: startOfMonth(target),
        before: endOfMonth(target),
        label: `in ${match[1]}`,
        confidence: 'exact',
      };
    },
  },

  // "N days ago"
  {
    regex: /\b(\d+)\s+days?\s+ago\b/i,
    resolve: (match, now) => {
      const n = parseInt(match[1], 10);
      const target = new Date(now);
      target.setDate(target.getDate() - n);
      return {
        after: startOfDay(target),
        before: endOfDay(target),
        label: `${n} day${n === 1 ? '' : 's'} ago`,
        confidence: 'approximate',
      };
    },
  },

  // "N weeks ago"
  {
    regex: /\b(\d+)\s+weeks?\s+ago\b/i,
    resolve: (match, now) => {
      const n = parseInt(match[1], 10);
      const target = new Date(now);
      target.setDate(target.getDate() - n * 7);
      return {
        after: startOfWeek(target),
        before: endOfWeek(target),
        label: `${n} week${n === 1 ? '' : 's'} ago`,
        confidence: 'approximate',
      };
    },
  },

  // "N months ago"
  {
    regex: /\b(\d+)\s+months?\s+ago\b/i,
    resolve: (match, now) => {
      const n = parseInt(match[1], 10);
      const target = new Date(now.getFullYear(), now.getMonth() - n, 1);
      return {
        after: startOfMonth(target),
        before: endOfMonth(target),
        label: `${n} month${n === 1 ? '' : 's'} ago`,
        confidence: 'approximate',
      };
    },
  },

  // "last time" / "recently"
  {
    regex: /\b(last\s+time|recently)\b/i,
    resolve: (match, now) => {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        after: startOfDay(thirtyDaysAgo),
        before: now,
        label: match[1].toLowerCase(),
        confidence: 'ambiguous',
      };
    },
  },
];

// ============================================================================
// Public API
// ============================================================================

/**
 * Parses a natural language time reference from a user query into a date range.
 *
 * Scans the query string for known temporal phrases ("yesterday", "last week",
 * "3 days ago", etc.) and resolves the first match into a `TemporalRange`
 * with concrete `Date` boundaries.
 *
 * @param query - The user's search query.
 * @returns The resolved time range, or `null` if no temporal reference was found.
 *
 * @example
 * ```ts
 * const range = parseTemporalReference('what did I do yesterday');
 * // range.label === 'yesterday'
 * // range.confidence === 'exact'
 * // range.after === start of yesterday
 * // range.before === end of yesterday
 * ```
 */
export function parseTemporalReference(query: string): TemporalRange | null {
  const now = new Date();

  for (const pattern of PATTERNS) {
    const match = query.match(pattern.regex);
    if (match) {
      return pattern.resolve(match, now);
    }
  }

  return null;
}

/**
 * Removes the matched temporal phrase from a query string.
 *
 * This is useful for cleaning up the query before passing it to keyword
 * or vector search, so that time-related words don't pollute the results.
 *
 * @param query - The user's original search query.
 * @returns The query with the temporal phrase removed and whitespace normalized.
 *
 * @example
 * ```ts
 * stripTemporalReference('remember when I fixed the CORS bug last week');
 * // "remember when I fixed the CORS bug"
 *
 * stripTemporalReference('what did I do yesterday');
 * // "what did I do"
 * ```
 */
export function stripTemporalReference(query: string): string {
  let result = query;

  for (const pattern of PATTERNS) {
    const match = result.match(pattern.regex);
    if (match) {
      result = result.replace(pattern.regex, '');
      break;
    }
  }

  // Normalize whitespace: collapse runs of spaces, trim ends
  return result.replace(/\s{2,}/g, ' ').trim();
}
