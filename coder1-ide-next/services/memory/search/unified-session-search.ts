/**
 * Unified Session Search
 *
 * Orchestrates both hybrid search (memory_chunks in johnny5.db) and
 * eternal memory search (session_summaries in context-memory.db) to
 * provide comprehensive session recall for Johnny5.
 *
 * Responsibilities:
 * 1. Allocate token budget based on query intent
 * 2. Run hybrid search and eternal memory search in parallel
 * 3. Deduplicate overlapping results by session ID
 * 4. Format results with session-aware formatting
 * 5. Return combined formatted context string
 */

import {
  hybridSearch,
  searchMemory,
  formatForPromptInjection,
  formatSessionMemoryForInjection,
  type HybridSearchConfig,
  type HybridSearchResult,
  type SearchResponse,
} from './hybrid-search';

import {
  type QueryIntentResult,
  allocateTokenBudget,
} from './query-intent';

// ============================================================================
// Types
// ============================================================================

export interface UnifiedSearchResult {
  /** Combined formatted context string ready for prompt injection */
  combinedFormatted: string;
  /** The search method used */
  searchType: string;
  /** Total tokens used across all sources */
  totalTokens: number;
  /** Memories used (for tracking/logging) */
  memoriesUsed: MemoryUsed[];
  /** Whether session-specific results were found */
  hasSessionResults: boolean;
  /** Whether eternal memory results were found */
  hasEternalResults: boolean;
  /** Processing time in ms */
  processingTimeMs: number;
}

interface MemoryUsed {
  id: string;
  sourceType: string;
  score: number;
  citation: {
    file: string;
    startLine: number | null;
    endLine: number | null;
  };
}

// ============================================================================
// Helpers
// ============================================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Try to load EternalMemorySearch. Returns null if the DB doesn't exist
 * or the module fails to load (graceful degradation).
 */
async function tryEternalSearch(
  query: string,
  maxResults: number
): Promise<{ sessionId: string; summary: string; relevanceScore: number }[]> {
  try {
    const { EternalMemorySearch } = await import('@/services/eternal-memory-search');
    const searcher = new EternalMemorySearch();

    try {
      const { results } = await searcher.search({
        text: query,
        limit: maxResults,
        minRelevance: 0.2,
      });

      return results.map(r => ({
        sessionId: r.sessionId,
        summary: r.summary,
        relevanceScore: r.relevanceScore,
      }));
    } finally {
      searcher.close();
    }
  } catch {
    // context-memory.db may not exist, or module may fail to load
    // This is expected for users who haven't enabled eternal memory
    return [];
  }
}

/**
 * Deduplicate results: if a session ID appears in both hybrid and eternal
 * results, keep the one with more detail (hybrid for specific queries,
 * eternal summary for overview queries).
 */
function deduplicateBySession(
  hybridResults: HybridSearchResult[],
  eternalResults: { sessionId: string; summary: string; relevanceScore: number }[],
  intent: QueryIntentResult
): {
  hybridResults: HybridSearchResult[];
  eternalResults: { sessionId: string; summary: string; relevanceScore: number }[];
} {
  // Extract session IDs from hybrid results (format: ide:{sessionId}:{type}:{index})
  const hybridSessionIds = new Set<string>();
  for (const r of hybridResults) {
    const parts = r.source_id.split(':');
    if (parts[0] === 'ide' && parts.length >= 3) {
      hybridSessionIds.add(parts[1]);
    }
  }

  // For specific intents (error, command, file_change), prefer detailed hybrid chunks
  // For overview intents (session_recall, general, decision), keep both but dedup
  const isSpecificIntent = ['error', 'command', 'file_change'].includes(intent.intent);

  if (isSpecificIntent) {
    // Remove eternal results that overlap with hybrid results
    const filteredEternal = eternalResults.filter(
      er => !hybridSessionIds.has(er.sessionId)
    );
    return { hybridResults, eternalResults: filteredEternal };
  }

  // For overview queries, keep both — they complement each other
  return { hybridResults, eternalResults };
}

/**
 * Format eternal memory results for prompt injection.
 */
function formatEternalResultsForInjection(
  results: { sessionId: string; summary: string; relevanceScore: number }[],
  maxTokens: number
): string {
  if (results.length === 0) return '';

  const parts: string[] = ['## Past Session Summaries\n'];
  let tokenCount = 25;

  for (const result of results) {
    // Truncate long summaries
    const summary = result.summary.length > 500
      ? result.summary.slice(0, 500) + '...'
      : result.summary;

    const entry = `### Session: ${result.sessionId}\n${summary}\n\n`;
    const entryTokens = estimateTokens(entry);

    if (tokenCount + entryTokens > maxTokens) break;

    parts.push(entry);
    tokenCount += entryTokens;
  }

  return parts.join('');
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Perform a unified search across both memory_chunks (johnny5.db) and
 * session_summaries (context-memory.db), orchestrated by query intent.
 *
 * @param query - The user's search query (temporal references already stripped)
 * @param queryEmbedding - Optional vector embedding for hybrid search
 * @param userId - The user ID to scope results
 * @param intent - The detected query intent with temporal range and source type preferences
 * @returns Combined search results formatted for prompt injection
 */
export async function unifiedSessionSearch(
  query: string,
  queryEmbedding: number[] | undefined,
  userId: string,
  intent: QueryIntentResult
): Promise<UnifiedSearchResult> {
  const startTime = Date.now();

  // 1. Allocate token budget based on intent
  const budget = allocateTokenBudget(intent.intent, 2000);

  // 2. Build hybrid search config with intent-aware boosting
  // 5x boost ensures intent-matched types rank above general terminal/error noise
  const sourceTypeBoosts: Record<string, number> = {};
  for (const st of intent.preferredSourceTypes) {
    sourceTypeBoosts[st] = 5.0;
  }

  const hybridConfig: HybridSearchConfig = {
    userId,
    topK: 8,
    maxTokens: budget.sessionBudget,
    minScore: 0.05,
    afterDate: intent.temporalRange?.after ?? undefined,
    beforeDate: intent.temporalRange?.before ?? undefined,
    sourceTypeBoosts,
    recencyBoost: intent.intent === 'session_recall' ? 0.3 : 0.1,
  };

  // 3. Run both searches in parallel
  const [hybridResponse, eternalResults] = await Promise.all([
    searchMemory(
      intent.strippedQuery || query,
      queryEmbedding ?? undefined,
      hybridConfig
    ),
    tryEternalSearch(intent.strippedQuery || query, 3),
  ]);

  // 3.5. Filter to session data only for session queries.
  // memory_chunks contains mixed source types (session, manuslive_memory, ide_*, claude_*).
  // For session recall queries, only ide_* and claude_* chunks are relevant —
  // ManusLive facts and other non-session data would confuse the response.
  if (intent.intent !== 'general') {
    hybridResponse.results = hybridResponse.results.filter(
      r => r.source_type.startsWith('ide_') || r.source_type.startsWith('claude_')
    );
  }

  // 4. Deduplicate overlapping results
  const deduped = deduplicateBySession(
    hybridResponse.results,
    eternalResults,
    intent
  );

  // 5. Format results
  const sessionMemoryFormatted = formatSessionMemoryForInjection(
    deduped.hybridResults,
    budget.sessionBudget
  );

  const eternalFormatted = formatEternalResultsForInjection(
    deduped.eternalResults,
    budget.factBudget
  );

  // 6. Combine formatted sections
  const combinedParts: string[] = [];
  if (sessionMemoryFormatted) {
    combinedParts.push(sessionMemoryFormatted);
  }
  if (eternalFormatted) {
    combinedParts.push(eternalFormatted);
  }

  const combinedFormatted = combinedParts.join('\n');

  // 7. Build memory tracking info
  const memoriesUsed: MemoryUsed[] = deduped.hybridResults.map(r => ({
    id: r.chunk_id,
    sourceType: r.source_type,
    score: r.combined_score,
    citation: r.citation,
  }));

  // Add eternal results as pseudo-memories for tracking
  for (const er of deduped.eternalResults) {
    memoriesUsed.push({
      id: er.sessionId,
      sourceType: 'eternal_session_summary',
      score: er.relevanceScore,
      citation: { file: er.sessionId, startLine: null, endLine: null },
    });
  }

  const totalTokens = estimateTokens(combinedFormatted);

  // Determine combined search type
  let searchType = hybridResponse.searchType;
  if (deduped.eternalResults.length > 0) {
    searchType = `${searchType}+eternal`;
  }

  const processingTimeMs = Date.now() - startTime;

  console.log(`[SessionMemory/UnifiedSearch] intent=${intent.intent}, hybrid=${deduped.hybridResults.length}, eternal=${deduped.eternalResults.length}, tokens=${totalTokens}, time=${processingTimeMs}ms`);

  return {
    combinedFormatted,
    searchType,
    totalTokens,
    memoriesUsed,
    hasSessionResults: deduped.hybridResults.length > 0,
    hasEternalResults: deduped.eternalResults.length > 0,
    processingTimeMs,
  };
}
