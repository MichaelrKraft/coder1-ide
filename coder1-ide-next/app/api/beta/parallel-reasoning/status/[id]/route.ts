import { NextRequest, NextResponse } from 'next/server';
import { parallelReasoning } from '@/services/beta/parallel-reasoning-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const session = parallelReasoning.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate overall progress
    const totalProgress = session.paths.reduce((sum, path) => sum + path.progress, 0);
    const averageProgress = session.paths.length > 0 ? totalProgress / session.paths.length : 0;

    // Get path summaries
    const pathSummaries = session.paths.map(path => ({
      id: path.id,
      strategyName: path.strategyName,
      status: path.status,
      progress: path.progress,
      confidence: path.confidence,
      hasError: !!path.error
    }));

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      progress: averageProgress,
      paths: pathSummaries,
      startTime: session.startTime,
      endTime: session.endTime,
      metadata: session.metadata
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get session status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}