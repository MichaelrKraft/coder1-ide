/**
 * Johnny5 Memory Hybrid Search
 *
 * Combines vector similarity search with keyword (BM25) search
 * for optimal retrieval quality.
 *
 * Formula: finalScore = (vectorWeight * vectorScore) + (keywordWeight * keywordScore)
 * Default weights: vector=0.7, keyword=0.3
 */

import {
  searchMemoryKeyword,
  searchMemoryVector,
  isVectorSearchAvailable,
  type MemorySearchResult,
} from '@/lib/johnny5-db';

// ============================================================================
// Types
// ============================================================================

export interface HybridSearchConfig {
  /** User ID to scope search results to. Required. */
  userId: string;
  /** Weight for vector similarity score (0-1). Default: 0.7 */
  vectorWeight?: number;
  /** Weight for keyword BM25 score (0-1). Default: 0.3 */
  keywordWeight?: number;
  /** Maximum results to return. Default: 10 */
  topK?: number;
  /** Minimum combined score threshold (0-1). Default: 0.1 */
  minScore?: number;
  /** Maximum tokens in combined results. Default: 4000 */
  maxTokens?: number;
  /** Prefer more recent content on tie scores. Default: true */
  preferRecent?: boolean;
}

export interface HybridSearchResult extends MemorySearchResult {
  /** Normalized vector score (0-1) */
  normalizedVectorScore: number;
  /** Normalized keyword score (0-1) */
  normalizedKeywordScore: number;
  /** Tokens in this chunk */
  tokenCount: number;
  /** Citation info */
  citation: {
    file: string;
    startLine: number | null;
    endLine: number | null;
  };
}

export interface SearchResponse {
  results: HybridSearchResult[];
  query: string;
  totalTokens: number;
  searchType: 'hybrid' | 'vector' | 'keyword';
  vectorAvailable: boolean;
  processingTimeMs: number;
}

// ============================================================================
// Normalization Helpers
// ============================================================================

/**
 * Normalize vector distance to similarity score (0-1)
 * sqlite-vec returns cosine distance, lower is better
 */
function normalizeVectorScore(distance: number): number {
  // Cosine distance ranges from 0 (identical) to 2 (opposite)
  // Convert to similarity: 1 - (distance / 2)
  return Math.max(0, Math.min(1, 1 - (distance / 2)));
}

/**
 * Normalize BM25 score to 0-1 range
 * BM25 scores are negative (lower is better in sqlite)
 */
function normalizeKeywordScore(bm25Score: number, allScores: number[]): number {
  if (allScores.length === 0) return 0;

  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);

  if (minScore === maxScore) return 1;

  // BM25 in SQLite FTS5 returns negative values, lower (more negative) is better
  // Normalize to 0-1 where 1 is best
  return (bm25Score - maxScore) / (minScore - maxScore);
}

/**
 * Estimate token count from text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Main Search Functions
// ============================================================================

/**
 * Perform hybrid search combining vector and keyword search
 */
export async function hybridSearch(
  query: string,
  queryEmbedding: number[] | null,
  config: HybridSearchConfig
): Promise<SearchResponse> {
  const startTime = Date.now();

  const {
    userId,
    vectorWeight = 0.7,
    keywordWeight = 0.3,
    topK = 10,
    minScore = 0.1,
    maxTokens = 4000,
    preferRecent = true,
  } = config;

  const vectorAvailable = isVectorSearchAvailable();
  let searchType: 'hybrid' | 'vector' | 'keyword' = 'keyword';

  // Fetch both vector and keyword results
  const [vectorResults, keywordResults] = await Promise.all([
    queryEmbedding && vectorAvailable
      ? searchMemoryVector(queryEmbedding, topK * 2, userId)
      : Promise.resolve([]),
    searchMemoryKeyword(query, topK * 2, userId),
  ]);

  // Determine search type
  if (vectorResults.length > 0 && keywordResults.length > 0) {
    searchType = 'hybrid';
  } else if (vectorResults.length > 0) {
    searchType = 'vector';
  }

  // Collect all BM25 scores for normalization
  const allKeywordScores = keywordResults.map(r => r.keyword_score);

  // Merge results by chunk_id
  const resultMap = new Map<string, HybridSearchResult>();

  // Process vector results
  for (const vr of vectorResults) {
    const normalizedVector = normalizeVectorScore(vr.vector_score);
    resultMap.set(vr.chunk_id, {
      ...vr,
      normalizedVectorScore: normalizedVector,
      normalizedKeywordScore: 0,
      tokenCount: estimateTokens(vr.content),
      citation: {
        file: vr.source_id,
        startLine: vr.start_line,
        endLine: vr.end_line,
      },
      combined_score: normalizedVector * vectorWeight,
    });
  }

  // Process keyword results
  for (const kr of keywordResults) {
    const normalizedKeyword = normalizeKeywordScore(kr.keyword_score, allKeywordScores);

    const existing = resultMap.get(kr.chunk_id);
    if (existing) {
      // Merge with existing vector result
      existing.normalizedKeywordScore = normalizedKeyword;
      existing.combined_score =
        (existing.normalizedVectorScore * vectorWeight) +
        (normalizedKeyword * keywordWeight);
    } else {
      // New keyword-only result
      resultMap.set(kr.chunk_id, {
        ...kr,
        normalizedVectorScore: 0,
        normalizedKeywordScore: normalizedKeyword,
        tokenCount: estimateTokens(kr.content),
        citation: {
          file: kr.source_id,
          startLine: kr.start_line,
          endLine: kr.end_line,
        },
        combined_score: normalizedKeyword * keywordWeight,
      });
    }
  }

  // Convert to array and sort by combined score
  let results = Array.from(resultMap.values())
    .filter(r => r.combined_score >= minScore)
    .sort((a, b) => {
      // Sort by combined score descending
      const scoreDiff = b.combined_score - a.combined_score;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

      // On tie, prefer more recent if enabled
      // (This would need timestamp data - for now just maintain order)
      return 0;
    });

  // Apply token budget limit
  let totalTokens = 0;
  const budgetedResults: HybridSearchResult[] = [];

  for (const result of results) {
    if (totalTokens + result.tokenCount > maxTokens) {
      break;
    }
    budgetedResults.push(result);
    totalTokens += result.tokenCount;
  }

  // Limit to topK
  results = budgetedResults.slice(0, topK);

  const processingTimeMs = Date.now() - startTime;

  return {
    results,
    query,
    totalTokens,
    searchType,
    vectorAvailable,
    processingTimeMs,
  };
}

/**
 * Keyword-only search (fallback when vector search unavailable)
 */
export async function keywordOnlySearch(
  query: string,
  config: Omit<HybridSearchConfig, 'vectorWeight' | 'keywordWeight'>
): Promise<SearchResponse> {
  const startTime = Date.now();

  const {
    userId,
    topK = 10,
    minScore = 0.1,
    maxTokens = 4000,
  } = config;

  console.log(`[Memory] Keyword search for: "${query.substring(0, 50)}..." minScore=${minScore}`);
  const keywordResults = await searchMemoryKeyword(query, topK * 2, userId);
  console.log(`[Memory] Keyword search returned ${keywordResults.length} raw results`);
  const allScores = keywordResults.map(r => r.keyword_score);

  let results: HybridSearchResult[] = keywordResults.map(kr => {
    const normalizedKeyword = normalizeKeywordScore(kr.keyword_score, allScores);
    return {
      ...kr,
      normalizedVectorScore: 0,
      normalizedKeywordScore: normalizedKeyword,
      combined_score: normalizedKeyword,
      tokenCount: estimateTokens(kr.content),
      citation: {
        file: kr.source_id,
        startLine: kr.start_line,
        endLine: kr.end_line,
      },
    };
  }).filter(r => r.combined_score >= minScore);

  // Apply token budget - skip oversized results instead of stopping
  let totalTokens = 0;
  const budgetedResults: HybridSearchResult[] = [];
  let skippedOversized = 0;

  for (const result of results) {
    // Skip individual results that are too large (> 50% of budget)
    if (result.tokenCount > maxTokens * 0.5) {
      skippedOversized++;
      continue;
    }

    if (totalTokens + result.tokenCount > maxTokens) {
      break;
    }
    budgetedResults.push(result);
    totalTokens += result.tokenCount;
  }

  if (skippedOversized > 0) {
    console.log(`[Memory] Skipped ${skippedOversized} oversized results (> ${maxTokens * 0.5} tokens each)`);
  }

  results = budgetedResults.slice(0, topK);

  return {
    results,
    query,
    totalTokens,
    searchType: 'keyword',
    vectorAvailable: isVectorSearchAvailable(),
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Search memory with automatic fallback
 *
 * If queryEmbedding is provided and vector search is available, uses hybrid search.
 * Otherwise falls back to keyword-only search.
 */
export async function searchMemory(
  query: string,
  queryEmbedding: number[] | undefined,
  config: HybridSearchConfig
): Promise<SearchResponse> {
  if (queryEmbedding && isVectorSearchAvailable()) {
    return hybridSearch(query, queryEmbedding, config);
  }
  return keywordOnlySearch(query, config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format search results for display
 */
export function formatSearchResults(response: SearchResponse): string {
  if (response.results.length === 0) {
    return 'No memories found matching your query.';
  }

  const lines: string[] = [
    `Found ${response.results.length} relevant memories (${response.searchType} search, ${response.processingTimeMs}ms):`,
    '',
  ];

  for (const result of response.results) {
    const source = result.source_type === 'session'
      ? `Session: ${result.source_id}`
      : result.citation.file;

    const lineInfo = result.citation.startLine
      ? `:${result.citation.startLine}-${result.citation.endLine}`
      : '';

    lines.push(`📄 ${source}${lineInfo} [${(result.combined_score * 100).toFixed(0)}%]`);
    lines.push(`   "${result.content.slice(0, 100)}${result.content.length > 100 ? '...' : ''}"`);
    lines.push('');
  }

  lines.push(`Total tokens: ${response.totalTokens}`);

  return lines.join('\n');
}

/**
 * Sanitize content for CLI injection
 * Removes HTML comments and patterns that could be interpreted as CLI flags
 */
function sanitizeForCLI(content: string): string {
  return content
    // Remove HTML comments (they contain --> which looks like a CLI flag)
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove any standalone --> or -- at start of lines
    .replace(/^--+>?\s*/gm, '')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Format results for injection into Claude prompt
 */
export function formatForPromptInjection(
  response: SearchResponse,
  maxTokens: number = 2000
): string {
  if (response.results.length === 0) {
    return '';
  }

  const parts: string[] = ['## Relevant Memories\n'];
  let tokenCount = 20; // Header tokens

  for (const result of response.results) {
    const source = result.source_type === 'session'
      ? `Session`
      : result.citation.file.split('/').pop() || result.citation.file;

    const lineRef = result.citation.startLine
      ? `:${result.citation.startLine}`
      : '';

    // Sanitize content to remove problematic CLI patterns
    const sanitizedContent = sanitizeForCLI(result.content);
    const entry = `### From ${source}${lineRef}\n${sanitizedContent}\n\n`;
    const entryTokens = estimateTokens(entry);

    if (tokenCount + entryTokens > maxTokens) break;

    parts.push(entry);
    tokenCount += entryTokens;
  }

  return parts.join('');
}
