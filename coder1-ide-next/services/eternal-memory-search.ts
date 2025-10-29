/**
 * Eternal Memory Search Service
 * 
 * Provides intelligent search across session summaries using FTS5 full-text search
 * combined with multi-factor relevance scoring to find the most relevant historical context.
 * 
 * Scoring Algorithm:
 * - FTS Rank: 40% (SQLite BM25 ranking)
 * - Keyword Density: 30% (keyword matches per text length)
 * - Recency: 20% (exponential decay, 30-day half-life)
 * - File Overlap: 10% (percentage of current files mentioned in session)
 * 
 * Performance:
 * - Target: <500ms for 90th percentile queries
 * - Optimization: Query result caching, indexed searches
 * - Scalability: Efficient for 100+ sessions
 */

import Database from 'better-sqlite3';
import path from 'path';

// Types
export interface SearchQuery {
  text: string;              // Search query text
  currentFiles?: string[];   // Current open files for file overlap scoring
  limit?: number;            // Max results to return (default: 5)
  minRelevance?: number;     // Minimum relevance score threshold (default: 0.3)
}

export interface SearchResult {
  sessionId: string;
  summary: string;
  filesWorked: string[];
  keyDecisions: string[];
  nextSteps: string[];
  timestamp: number;
  relevanceScore: number;    // Combined score 0-1
  scoreBreakdown: {
    ftsRank: number;         // 0-1
    keywordDensity: number;  // 0-1
    recency: number;         // 0-1
    fileOverlap: number;     // 0-1
  };
  snippet: string;           // Highlighted search snippet
}

export interface SearchStats {
  query: string;
  resultsFound: number;
  executionTimeMs: number;
  avgRelevanceScore: number;
  cacheHit: boolean;
}

/**
 * Eternal Memory Search Service
 */
export class EternalMemorySearch {
  private db: Database.Database;
  private queryCache: Map<string, { results: SearchResult[]; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly RECENCY_HALF_LIFE_DAYS = 30;

  constructor() {
    const dbPath = path.join(process.cwd(), 'db', 'context-memory.db');
    this.db = new Database(dbPath);
    this.queryCache = new Map();
    
    // Enable WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Search session summaries with multi-factor relevance scoring
   */
  public async search(query: SearchQuery): Promise<{ results: SearchResult[]; stats: SearchStats }> {
    const startTime = Date.now();
    
    // Check cache
    const cacheKey = this.getCacheKey(query);
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        results: cached.results,
        stats: {
          query: query.text,
          resultsFound: cached.results.length,
          executionTimeMs: Date.now() - startTime,
          avgRelevanceScore: this.calculateAvgScore(cached.results),
          cacheHit: true
        }
      };
    }

    // Perform FTS search
    const ftsResults = this.performFTSSearch(query.text, query.limit || 10);
    
    // Calculate multi-factor relevance scores
    const scoredResults = ftsResults.map(result => 
      this.calculateRelevanceScore(result, query)
    );

    // Filter by minimum relevance threshold
    const minRelevance = query.minRelevance ?? 0.3;
    const filteredResults = scoredResults
      .filter(r => r.relevanceScore >= minRelevance)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, query.limit || 5);

    // Cache results
    this.queryCache.set(cacheKey, {
      results: filteredResults,
      timestamp: Date.now()
    });

    // Clean old cache entries
    this.cleanCache();

    const stats: SearchStats = {
      query: query.text,
      resultsFound: filteredResults.length,
      executionTimeMs: Date.now() - startTime,
      avgRelevanceScore: this.calculateAvgScore(filteredResults),
      cacheHit: false
    };

    return { results: filteredResults, stats };
  }

  /**
   * Perform FTS5 search with BM25 ranking
   */
  private performFTSSearch(queryText: string, limit: number): RawSearchResult[] {
    // Sanitize query for FTS5 (escape special characters)
    const sanitized = this.sanitizeFTSQuery(queryText);
    
    const stmt = this.db.prepare(`
      SELECT 
        s.id,
        s.summary,
        s.files_worked,
        s.key_decisions,
        s.next_steps,
        s.timestamp,
        snippet(session_summaries_fts, 1, '<mark>', '</mark>', '...', 32) as snippet,
        bm25(session_summaries_fts) as fts_rank
      FROM session_summaries_fts
      JOIN session_summaries s ON s.id = session_summaries_fts.session_id
      WHERE session_summaries_fts MATCH ?
      ORDER BY bm25(session_summaries_fts)
      LIMIT ?
    `);

    const rows = stmt.all(sanitized, limit * 2) as any[]; // Get 2x limit for scoring filtering

    return rows.map(row => ({
      sessionId: row.id,
      summary: row.summary || '',
      filesWorked: row.files_worked ? row.files_worked.split('\n').filter((f: string) => f.trim()) : [],
      keyDecisions: row.key_decisions ? row.key_decisions.split('\n').filter((d: string) => d.trim()) : [],
      nextSteps: row.next_steps ? row.next_steps.split('\n').filter((s: string) => s.trim()) : [],
      timestamp: row.timestamp,
      snippet: row.snippet || row.summary.substring(0, 100) + '...',
      ftsRank: row.fts_rank
    }));
  }

  /**
   * Calculate multi-factor relevance score
   */
  private calculateRelevanceScore(
    result: RawSearchResult,
    query: SearchQuery
  ): SearchResult {
    const now = Date.now();
    
    // 1. FTS Rank Score (40%) - Normalize BM25 score
    // BM25 returns negative scores, lower is better
    // Normalize to 0-1 range (assume -10 to 0 range)
    const ftsScore = Math.max(0, Math.min(1, (result.ftsRank + 10) / 10));

    // 2. Keyword Density Score (30%)
    const keywords = query.text.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    const keywordScore = this.calculateKeywordDensity(result, keywords);

    // 3. Recency Score (20%) - Exponential decay
    const ageInDays = (now - result.timestamp) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-ageInDays / this.RECENCY_HALF_LIFE_DAYS);

    // 4. File Overlap Score (10%)
    const fileOverlapScore = query.currentFiles 
      ? this.calculateFileOverlap(result.filesWorked, query.currentFiles)
      : 0;

    // Weighted combination
    const relevanceScore = 
      (ftsScore * 0.4) +
      (keywordScore * 0.3) +
      (recencyScore * 0.2) +
      (fileOverlapScore * 0.1);

    return {
      ...result,
      relevanceScore,
      scoreBreakdown: {
        ftsRank: ftsScore,
        keywordDensity: keywordScore,
        recency: recencyScore,
        fileOverlap: fileOverlapScore
      }
    };
  }

  /**
   * Calculate keyword density score
   */
  private calculateKeywordDensity(result: RawSearchResult, keywords: string[]): number {
    const fullText = [
      result.summary,
      ...result.keyDecisions,
      ...result.nextSteps
    ].join(' ').toLowerCase();

    if (fullText.length === 0) return 0;

    const matches = keywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const keywordMatches = fullText.match(regex);
      return count + (keywordMatches ? keywordMatches.length : 0);
    }, 0);

    // Normalize by text length (matches per 1000 chars)
    const density = (matches / fullText.length) * 1000;
    
    // Cap at 1.0 (assume 10+ matches per 1000 chars is maximum relevance)
    return Math.min(1.0, density / 10);
  }

  /**
   * Calculate file overlap score
   */
  private calculateFileOverlap(sessionFiles: string[], currentFiles: string[]): number {
    if (currentFiles.length === 0 || sessionFiles.length === 0) return 0;

    const currentSet = new Set(currentFiles.map(f => this.normalizeFilePath(f)));
    const sessionSet = new Set(sessionFiles.map(f => this.normalizeFilePath(f)));

    let matches = 0;
    for (const file of currentSet) {
      if (sessionSet.has(file)) matches++;
    }

    return matches / currentFiles.length;
  }

  /**
   * Normalize file path for comparison (remove leading slashes, normalize separators)
   */
  private normalizeFilePath(filepath: string): string {
    return filepath.replace(/^\/+/, '').replace(/\\/g, '/').toLowerCase();
  }

  /**
   * Sanitize FTS query text (escape special FTS5 characters)
   */
  private sanitizeFTSQuery(query: string): string {
    // Remove or escape FTS5 special characters: " * ( ) . ? AND OR NOT
    return query
      .replace(/[*"().?]/g, '')  // Remove special chars including periods and question marks
      .replace(/\b(AND|OR|NOT)\b/gi, '')  // Remove FTS operators
      .trim();
  }

  /**
   * Generate cache key
   */
  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      text: query.text,
      files: query.currentFiles?.sort() || [],
      limit: query.limit || 5
    });
  }

  /**
   * Calculate average relevance score
   */
  private calculateAvgScore(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + r.relevanceScore, 0);
    return sum / results.length;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Get search statistics
   */
  public getStats(): { 
    cacheSize: number;
    totalSessions: number;
  } {
    const totalSessions = this.db.prepare(
      'SELECT COUNT(*) as count FROM session_summaries'
    ).get() as { count: number };

    return {
      cacheSize: this.queryCache.size,
      totalSessions: totalSessions.count
    };
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }
}

// Internal types
interface RawSearchResult {
  sessionId: string;
  summary: string;
  filesWorked: string[];
  keyDecisions: string[];
  nextSteps: string[];
  timestamp: number;
  snippet: string;
  ftsRank: number;
}
