/**
 * Memory Search Module
 *
 * Provides hybrid, vector, and keyword search capabilities
 * for the Johnny5 memory system, including session memory
 * search with temporal parsing and intent detection.
 */

export {
  hybridSearch,
  keywordOnlySearch,
  searchMemory,
  formatSearchResults,
  formatForPromptInjection,
  formatSessionMemoryForInjection,
  type HybridSearchConfig,
  type HybridSearchResult,
  type SearchResponse,
} from './hybrid-search';

// Temporal parsing
export {
  parseTemporalReference,
  stripTemporalReference,
  type TemporalRange,
} from './temporal-parser';

// Query intent detection
export {
  detectSessionQueryIntent,
  allocateTokenBudget,
  type SessionQueryIntent,
  type QueryIntentResult,
  type TokenBudgetAllocation,
} from './query-intent';

// Unified session search
export {
  unifiedSessionSearch,
  type UnifiedSearchResult,
} from './unified-session-search';
