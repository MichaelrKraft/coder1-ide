/**
 * GET /api/parallel-exploration/status/[sessionId]
 * 
 * Get status of an exploration session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createParallelExplorationService } from '@/services/glm-parallel-exploration-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    console.log('[Status API] 📥 Request for session:', sessionId);
    console.log('[Status API] 🌍 Global singleton exists:', !!global.__PARALLEL_EXPLORATION_SERVICE__);
    
    const service = createParallelExplorationService();
    console.log('[Status API] 🔍 Service retrieved/created');

    const session = service.getSession(sessionId);
    console.log('[Status API] 📋 Session lookup result:', { 
      found: !!session, 
      status: session?.status,
      agentCount: session?.agents?.length,
      hasResults: !!session?.results,
      resultsCount: session?.results?.length
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        domain: session.detectedDomain,
        domainConfidence: session.domainConfidence,
        strategyCount: session.strategies.length,
        agents: session.agents.map(a => ({
          id: a.agentId,
          strategy: a.strategy.name,
          status: a.status,
          progress: a.progress,
          sandboxId: a.sandboxId
        })),
        results: session.results,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        error: session.error
      }
    });

  } catch (error) {
    console.error('[API] Parallel exploration status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get session status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
