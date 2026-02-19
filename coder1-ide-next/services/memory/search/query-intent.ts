/**
 * Query Intent Detection for Johnny5 Session Memory
 *
 * Detects what type of session data a user is looking for in their query
 * using regex-based pattern matching. This module classifies queries into
 * intents like file_change, error, command, decision, or session_recall,
 * and allocates token budgets between session memory and facts/patterns
 * based on the detected intent.
 *
 * No AI/LLM calls are made -- all detection is regex-based for speed.
 */

import {
  parseTemporalReference,
  stripTemporalReference,
  type TemporalRange,
} from './temporal-parser';

// ============================================================================
// Types
// ============================================================================

/** The type of session data a user query is looking for. */
export type SessionQueryIntent =
  | 'file_change'
  | 'error'
  | 'command'
  | 'decision'
  | 'session_recall'
  | 'general';

/** Result of detecting the intent behind a session memory query. */
export interface QueryIntentResult {
  /** The detected intent category. */
  intent: SessionQueryIntent;
  /** Confidence score from 0 to 1. */
  confidence: number;
  /** Which memory_chunks source_types to boost in search results. */
  preferredSourceTypes: string[];
  /** Parsed temporal range from the query, if any. */
  temporalRange: TemporalRange | null;
  /** Query with temporal references removed for better keyword matching. */
  strippedQuery: string;
}

/** Token budget allocation between session memory and facts/patterns. */
export interface TokenBudgetAllocation {
  /** Tokens allocated for session memory results. */
  sessionBudget: number;
  /** Tokens allocated for facts and patterns results. */
  factBudget: number;
}

// ============================================================================
// Pattern Definitions
// ============================================================================

interface IntentPatternGroup {
  intent: SessionQueryIntent;
  preferredSourceTypes: string[];
  patterns: RegExp[];
}

/**
 * Pattern groups for each intent category.
 * Order matters: first match wins, so more specific intents come first.
 */
const INTENT_PATTERN_GROUPS: IntentPatternGroup[] = [
  {
    intent: 'file_change',
    preferredSourceTypes: ['ide_file_change'],
    patterns: [
      /\bwhat\s+files?\s+(did|have)\s+(i|we)\b/i,
      /\bwhat\s+changes?\s+(did|have)\s+(i|we)\b/i,
      /\bwhich\s+files?\s+(did|have)\s+(i|we)\s+(change|edit|modify|touch|update|create|delete|remove)\b/i,
      /\bfiles?\s+(i|we)\s+(changed|edited|modified|touched|updated|created|deleted|removed)\b/i,
      /\b(show|list)\s+(me\s+)?(the\s+)?(file|files)\s+(i|we)\s+(changed|edited|modified)\b/i,
      /\b(what|which)\s+(did\s+)?(i|we)\s+(change|edit|modify|update)\b/i,
      /\bwhat\s+files?\s+(did|have)\s+(i|we)\s+(recently\s+)?commit(ted)?\b/i,
      /\bwhat\s+(did\s+)?(i|we)\s+(commit|push|merge)\b/i,
    ],
  },
  {
    intent: 'error',
    preferredSourceTypes: ['ide_error'],
    patterns: [
      /\bwhat\s+errors?\s+(did|have)\s+(i|we)\b/i,
      /\bwhat\s+bugs?\s+(did|have)\s+(i|we)\b/i,
      /\berrors?\s+(i|we)\s+(hit|saw|got|encountered|ran\s+into)\b/i,
      /\bbugs?\s+(i|we)\s+(hit|saw|got|encountered|ran\s+into|found)\b/i,
      /\b(did|have)\s+(i|we)\s+(hit|see|get|encounter|run\s+into)\s+(any\s+)?(errors?|bugs?|issues?|crashes?|exceptions?)\b/i,
      /\b(show|list)\s+(me\s+)?(the\s+)?(errors?|bugs?|exceptions?|crashes?)\b/i,
      /\bwhat\s+(went\s+wrong|broke|failed|crashed)\b/i,
    ],
  },
  {
    intent: 'command',
    preferredSourceTypes: ['ide_command', 'ide_terminal_chunk'],
    patterns: [
      /\bwhat\s+commands?\s+(did|have)\s+(i|we)\s+(run|execute|type)\b/i,
      /\bcommands?\s+(i|we)\s+(ran|executed|typed|used)\b/i,
      /\b(did|have)\s+(i|we)\s+run\b/i,
      /\b(show|list)\s+(me\s+)?(the\s+)?(commands?|terminal)\s+(i|we)\b/i,
      /\bwhat\s+(did\s+)?(i|we)\s+(run|execute)\s+(in\s+)?(the\s+)?terminal\b/i,
      /\bterminal\s+(history|output|commands?)\b/i,
    ],
  },
  {
    intent: 'decision',
    preferredSourceTypes: ['ide_session_summary'],
    patterns: [
      /\bwhy\s+did\s+(i|we)\s+(decide|choose|pick|go\s+with|opt|select)\b/i,
      /\bwhat\s+(made|led)\s+(me|us)\s+(to\s+)?(decide|choose)\b/i,
      /\b(reasoning|rationale|decision)\s+(behind|for)\b/i,
      /\bwhy\s+(did\s+)?(i|we)\s+(go|went)\s+with\b/i,
      /\bwhat\s+was\s+(the|my|our)\s+(reasoning|rationale|decision|thought\s+process)\b/i,
    ],
  },
  {
    intent: 'session_recall',
    preferredSourceTypes: ['ide_session_summary', 'ide_terminal_chunk', 'claude_session', 'claude_session_summary'],
    patterns: [
      /\bremember\s+when\b/i,
      /\bremember\s+that\s+session\b/i,
      /\bthat\s+session\s+(where|when)\b/i,
      /\bwhat\s+did\s+(i|we)\s+do\b/i,
      /\bwhat\s+(was|were)\s+(i|we)\s+(doing|working\s+on)\b/i,
      /\bwhat\s+(did\s+)?(i|we)\s+work\s+on\b/i,
      /\b(last|previous|earlier|recent)\s+session\b/i,
      /\b(recap|summarize|summary\s+of)\s+(the\s+)?(last|previous|that|my|our)?\s*session\b/i,
      /\bwhat\s+happened\s+(in|during)\s+(the\s+)?(last|previous|that)?\s*session\b/i,
      // Patterns for "remember the last conversation" and similar
      /\bremember\s+(the\s+)?(last|previous|our|this)\s+(conversation|chat|session|discussion)\b/i,
      /\bdo\s+you\s+remember\b/i,
      /\b(last|previous|recent)\s+(conversation|chat|discussion)\b/i,
      /\bwhat\s+did\s+(we|i)\s+(talk|chat|discuss)\b/i,
      /\bwhat\s+did\s+(we|i)\s+(cover|go\s+over)\b/i,
      /\blast\s+time\s+(we|i)\b/i,
      /\b(from|in)\s+(the\s+)?(last|previous|our\s+last)\s+(conversation|session|chat)\b/i,
      /\bour\s+last\s+(conversation|chat|session|discussion)\b/i,
      /\bprevious\s+(conversation|chat)\b/i,
    ],
  },
];

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Match a query against a list of patterns and return all matched strings.
 */
function matchPatterns(query: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Calculate confidence score based on match count and message length.
 * Uses the same approach as query-classifier.ts: base from match count
 * plus a boost for shorter (more focused) messages.
 */
function calculateConfidence(matchCount: number, messageLength: number): number {
  if (matchCount === 0) return 0;

  // Base confidence from number of matches
  const matchConfidence = Math.min(0.9, 0.5 + (matchCount * 0.15));

  // Boost for shorter messages (more likely to be direct queries)
  const lengthBoost = messageLength < 50 ? 0.1 : (messageLength < 100 ? 0.05 : 0);

  return Math.min(0.95, matchConfidence + lengthBoost);
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Detect the intent behind a session memory query.
 *
 * Analyzes the query with regex patterns to determine what type of session
 * data the user is looking for (file changes, errors, commands, decisions,
 * or general session recall). Also parses any temporal references in the
 * query (e.g., "yesterday", "last week") and strips them from the query
 * to improve keyword matching downstream.
 *
 * @param query - The user's natural language query
 * @returns The detected intent, confidence, preferred source types, temporal
 *          range, and a cleaned query string
 */
export function detectSessionQueryIntent(query: string): QueryIntentResult {
  const normalizedQuery = query.toLowerCase().trim();

  // Parse and strip temporal references
  const temporalRange = parseTemporalReference(query);
  const strippedQuery = stripTemporalReference(query);

  // Try each intent group in order (most specific first)
  let bestIntent: SessionQueryIntent = 'general';
  let bestConfidence = 0;
  let bestSourceTypes: string[] = [];

  for (const group of INTENT_PATTERN_GROUPS) {
    const matches = matchPatterns(normalizedQuery, group.patterns);

    if (matches.length > 0) {
      const confidence = calculateConfidence(matches.length, normalizedQuery.length);

      if (confidence > bestConfidence) {
        bestIntent = group.intent;
        bestConfidence = confidence;
        bestSourceTypes = group.preferredSourceTypes;
      }
    }
  }

  return {
    intent: bestIntent,
    confidence: bestIntent === 'general' ? 0.5 : bestConfidence,
    preferredSourceTypes: bestSourceTypes,
    temporalRange,
    strippedQuery,
  };
}

/**
 * Allocate a token budget between session memory and facts/patterns
 * based on the detected query intent.
 *
 * Different intents benefit from different proportions of session data
 * versus stored facts. For example, session_recall queries heavily
 * favor session memory, while general queries favor facts/patterns
 * that provide broader context.
 *
 * @param intent - The detected session query intent
 * @param totalBudget - Total token budget to allocate (default: 2000)
 * @returns An object with sessionBudget and factBudget token counts
 */
export function allocateTokenBudget(
  intent: SessionQueryIntent,
  totalBudget: number = 2000
): TokenBudgetAllocation {
  let sessionPct: number;

  switch (intent) {
    case 'session_recall':
      sessionPct = 0.7;
      break;
    case 'file_change':
    case 'error':
    case 'command':
      sessionPct = 0.7;
      break;
    case 'decision':
      sessionPct = 0.5;
      break;
    case 'general':
    default:
      sessionPct = 0.3;
      break;
  }

  const sessionBudget = Math.round(totalBudget * sessionPct);
  const factBudget = totalBudget - sessionBudget;

  return { sessionBudget, factBudget };
}
