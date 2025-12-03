/**
 * POST /api/parallel-exploration/spawn
 * 
 * Spawn a new parallel exploration session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createParallelExplorationService } from '@/services/glm-parallel-exploration-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, count, budget, domain, userId, projectId, apiKey, provider } = body;

    console.log('[Spawn API] 📥 Request received:', { task, count, budget, provider, hasApiKey: !!apiKey });

    // Validation
    if (!task || typeof task !== 'string') {
      console.log('[Spawn API] ❌ Validation failed: No task');
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    if (!count || count < 2 || count > 5) {
      console.log('[Spawn API] ❌ Validation failed: Invalid count');
      return NextResponse.json(
        { error: 'Count must be between 2 and 5' },
        { status: 400 }
      );
    }

    if (!['cost-optimized', 'balanced', 'quality-optimized'].includes(budget)) {
      console.log('[Spawn API] ❌ Validation failed: Invalid budget');
      return NextResponse.json(
        { error: 'Invalid budget option' },
        { status: 400 }
      );
    }

    // API Key validation
    if (!apiKey || !provider) {
      console.log('[Spawn API] ❌ Missing API key or provider');
      return NextResponse.json(
        { error: 'API key and provider are required' },
        { status: 400 }
      );
    }

    console.log('[Spawn API] ✅ Creating service with API key');
    const service = createParallelExplorationService(apiKey, provider);

    console.log('[Spawn API] 🚀 Starting exploration...');
    const session = await service.explore({
      task,
      count,
      budget,
      domain,
      userId: userId || 'default-user',
      projectId
    });

    console.log('[Spawn API] ✅ Exploration session created:', session.id);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        task: session.config.task,
        count: session.config.count,
        budget: session.config.budget,
        domain: session.detectedDomain,
        domainConfidence: session.domainConfidence,
        strategies: session.strategies,
        agentCount: session.agents.length,
        status: session.status,
        createdAt: session.createdAt
      }
    });

  } catch (error) {
    console.error('[Spawn API] ❌ Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to spawn exploration session',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
