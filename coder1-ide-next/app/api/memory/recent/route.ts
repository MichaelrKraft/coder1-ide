import { NextRequest, NextResponse } from 'next/server';
import { EternalMemorySearch } from '@/services/eternal-memory-search';

export const dynamic = 'force-dynamic';

/**
 * Recent Sessions API
 * 
 * Loads recent development sessions for context and continuity.
 * Uses direct database access via EternalMemorySearch service.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit') || '10';
    const limit = parseInt(limitParam, 10);
    
    const search = new EternalMemorySearch();
    
    // Search with generic term to get all sessions, sorted by timestamp
    const { results } = await search.search({
      text: 'session',
      limit: limit,
      minRelevance: 0.0
    });
    
    // Transform to simplified format for recent sessions API
    const sessions = results.map(result => ({
      sessionId: result.sessionId,
      summary: result.summary,
      filesWorked: result.filesWorked,
      keyDecisions: result.keyDecisions,
      nextSteps: result.nextSteps,
      timestamp: result.timestamp,
      date: new Date(result.timestamp).toISOString()
    }));
    
    search.close();
    
    return NextResponse.json({ sessions, count: sessions.length });
    
  } catch (error) {
    console.error('Error loading recent sessions:', error);
    return NextResponse.json({ 
      sessions: [], 
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
