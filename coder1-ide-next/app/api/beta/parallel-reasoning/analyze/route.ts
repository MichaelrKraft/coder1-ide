import { NextRequest, NextResponse } from 'next/server';
import { parallelReasoning, REASONING_STRATEGIES } from '@/services/beta/parallel-reasoning-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, strategies, metadata } = body;

    if (!problem) {
      return NextResponse.json(
        { error: 'Problem is required' },
        { status: 400 }
      );
    }

    // Validate strategies if provided
    if (strategies) {
      const validStrategies = REASONING_STRATEGIES.map(s => s.id);
      const invalidStrategies = strategies.filter((s: string) => !validStrategies.includes(s));
      
      if (invalidStrategies.length > 0) {
        return NextResponse.json(
          { error: `Invalid strategies: ${invalidStrategies.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Start parallel reasoning session
    const session = await parallelReasoning.startReasoning(
      problem,
      strategies,
      metadata
    );

    logger?.info('Parallel reasoning session started', {
      sessionId: session.id,
      strategies: session.strategies.length
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      strategies: session.strategies,
      status: session.status
    });

  } catch (error) {
    logger?.error('Failed to start parallel reasoning', error);
    
    return NextResponse.json(
      { error: 'Failed to start parallel reasoning', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get available strategies
export async function GET() {
  return NextResponse.json({
    strategies: REASONING_STRATEGIES.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      icon: s.icon,
      weight: s.weight
    }))
  });
}