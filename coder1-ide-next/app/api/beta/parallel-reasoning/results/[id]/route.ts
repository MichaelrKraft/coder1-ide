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

    // Only return results if session is completed
    if (session.status !== 'completed' && session.status !== 'failed') {
      return NextResponse.json(
        { 
          error: 'Session not completed', 
          status: session.status,
          message: 'Results will be available when reasoning is complete'
        },
        { status: 202 }
      );
    }

    // Get detailed path results
    const pathResults = session.paths.map(path => ({
      id: path.id,
      strategyId: path.strategyId,
      strategyName: path.strategyName,
      status: path.status,
      solution: path.solution,
      confidence: path.confidence,
      reasoning: path.reasoning,
      tokensUsed: path.tokensUsed,
      duration: path.endTime && path.startTime ? 
        path.endTime.getTime() - path.startTime.getTime() : null,
      error: path.error
    }));

    return NextResponse.json({
      sessionId: session.id,
      problem: session.problem,
      status: session.status,
      finalSolution: session.finalSolution,
      votingResults: session.votingResults ? {
        winner: session.votingResults.winner,
        votes: Array.from(session.votingResults.votes.entries()),
        confidence: session.votingResults.confidence,
        synthesized: session.votingResults.synthesized
      } : null,
      paths: pathResults,
      totalTokensUsed: session.totalTokensUsed,
      duration: session.endTime && session.startTime ? 
        session.endTime.getTime() - session.startTime.getTime() : null,
      metadata: session.metadata
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get session results', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Cancel a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const cancelled = parallelReasoning.cancelSession(sessionId);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Session not found or already completed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session cancelled'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to cancel session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}