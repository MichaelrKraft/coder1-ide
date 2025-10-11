import { NextRequest, NextResponse } from 'next/server';
import { EternalMemorySearch } from '@/services/eternal-memory-search';

export const dynamic = 'force-dynamic';

/**
 * Memory Context API
 * 
 * Retrieves relevant context from previous sessions for AI continuity.
 * Uses direct database access via EternalMemorySearch service.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const maxTokensParam = searchParams.get('maxTokens') || '1000';
    const maxTokens = parseInt(maxTokensParam, 10);
    
    const search = new EternalMemorySearch();
    
    // Search for relevant context
    const { results, stats } = await search.search({
      text: query || 'recent work',
      limit: 5,
      minRelevance: 0.3
    });
    
    // Format context for AI consumption
    let relevantContext: Array<{
      sessionId: string;
      summary: string;
      relevance: number;
      timestamp: string;
    }> = [];
    
    let totalTokens = 0;
    const APPROX_TOKENS_PER_CHAR = 0.25;
    
    for (const result of results) {
      const contextEntry = {
        sessionId: result.sessionId,
        summary: result.summary,
        relevance: result.relevanceScore,
        timestamp: new Date(result.timestamp).toISOString()
      };
      
      const estimatedTokens = Math.ceil(result.summary.length * APPROX_TOKENS_PER_CHAR);
      
      if (totalTokens + estimatedTokens <= maxTokens) {
        relevantContext.push(contextEntry);
        totalTokens += estimatedTokens;
      } else {
        break;
      }
    }
    
    const recentSummary = results.length > 0 
      ? `Found ${results.length} relevant session(s). Most recent: ${new Date(results[0].timestamp).toLocaleDateString()}`
      : 'No relevant sessions found';
    
    search.close();
    
    return NextResponse.json({
      recentSummary,
      relevantContext,
      totalTokens,
      sessionCount: relevantContext.length,
      searchStats: {
        query: stats.query,
        resultsFound: stats.resultsFound,
        executionTimeMs: stats.executionTimeMs
      }
    });
    
  } catch (error) {
    console.error('Error getting memory context:', error);
    return NextResponse.json({
      recentSummary: '',
      relevantContext: [],
      totalTokens: 0,
      sessionCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
