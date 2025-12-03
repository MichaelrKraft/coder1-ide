/**
 * POST /api/parallel-exploration/stop/[sessionId]
 * 
 * Stop a running exploration session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createParallelExplorationService } from '@/services/glm-parallel-exploration-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const service = createParallelExplorationService();

    await service.stopSession(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session stopped',
      sessionId
    });

  } catch (error) {
    console.error('[API] Parallel exploration stop error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to stop session',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
