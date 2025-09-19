import { NextRequest, NextResponse } from 'next/server';
import { enhancedMemoryContext, type RAGQuery } from '@/services/enhanced-memory-context';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query: RAGQuery = body.query || {
      projectType: 'web-application',
      framework: 'react',
      features: ['authentication', 'database'],
      agentType: 'frontend-engineer',
      taskDescription: 'Build React component',
      timeframe: 'last_7_days',
      limit: 3
    };

    logger.debug('🔍 Testing Enhanced Memory Context with query:', query);

    // Get memory context
    const memoryContext = await enhancedMemoryContext.getMemoryContext(query);

    // Get cache statistics
    const cacheStats = enhancedMemoryContext.getCacheStats();

    const response = {
      success: true,
      query,
      cacheStats,
      results: {
        relevantPatternsCount: memoryContext.relevantPatterns.length,
        relatedOutcomesCount: memoryContext.relatedOutcomes.length,
        sessionHistoryCount: memoryContext.sessionHistory.length,
        commonIssuesCount: memoryContext.commonIssues.length,
        successfulApproachesCount: memoryContext.successfulApproaches.length
      },
      memoryContext: {
        relevantPatterns: memoryContext.relevantPatterns.map(p => ({
          content: p.content.substring(0, 100) + (p.content.length > 100 ? '...' : ''),
          confidence: p.confidence,
          usageCount: p.usageCount,
          agentType: p.agentType
        })),
        relatedOutcomes: memoryContext.relatedOutcomes.map(o => ({
          taskDescription: o.taskDescription.substring(0, 100) + (o.taskDescription.length > 100 ? '...' : ''),
          outcome: o.outcome,
          successRating: o.successRating,
          agentType: o.agentType,
          approachUsed: o.approachUsed
        })),
        sessionHistory: memoryContext.sessionHistory.map(s => ({
          sessionId: s.sessionId,
          timestamp: s.timestamp,
          terminalCount: s.terminal.length,
          fileChangesCount: s.fileChanges.length,
          commitsCount: s.commits.length,
          preview: s.content.substring(0, 200) + (s.content.length > 200 ? '...' : '')
        })),
        commonIssues: memoryContext.commonIssues.map(i => ({
          content: i.content.substring(0, 100) + (i.content.length > 100 ? '...' : ''),
          confidence: i.confidence,
          usageCount: i.usageCount
        })),
        successfulApproaches: memoryContext.successfulApproaches.map(a => ({
          taskDescription: a.taskDescription.substring(0, 100) + (a.taskDescription.length > 100 ? '...' : ''),
          approachUsed: a.approachUsed,
          timeTaken: a.timeTaken,
          filesModified: a.filesModified.slice(0, 3)
        }))
      }
    };

    logger.debug('✅ Memory context test completed successfully');
    logger.debug(`📊 Results: ${response.results.sessionHistoryCount} sessions, ${response.results.relevantPatternsCount} patterns, ${response.results.successfulApproachesCount} approaches`);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('❌ Memory context test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get cache statistics only
    const cacheStats = enhancedMemoryContext.getCacheStats();
    
    return NextResponse.json({
      success: true,
      message: 'Enhanced Memory Context API endpoint',
      cacheStats,
      usage: {
        endpoint: '/api/memory/test',
        methods: ['GET', 'POST'],
        description: 'Test the enhanced memory context RAG system',
        exampleQuery: {
          projectType: 'web-application',
          framework: 'react',
          features: ['authentication', 'database'],
          agentType: 'frontend-engineer',
          taskDescription: 'Build React component',
          timeframe: 'last_7_days',
          limit: 3
        }
      }
    });
  } catch (error) {
    logger.error('❌ Memory context status check failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}