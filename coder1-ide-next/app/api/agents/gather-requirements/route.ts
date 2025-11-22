import { NextRequest, NextResponse } from 'next/server';
import { getRequirementsGatherer } from '@/services/requirements-gatherer';
import { logger } from '@/lib/logger';

/**
 * POST /api/agents/gather-requirements
 * 
 * Gather detailed requirements through conversational AI
 * 
 * Request body:
 * - initialRequest: string (user's initial vague or specific request)
 * - mode: 'full' | 'simplified' (default: 'full')
 * 
 * Returns:
 * - DetailedRequirements object with all gathered context
 */
export async function POST(request: NextRequest) {
  try {
    const { initialRequest, mode = 'full' } = await request.json();

    if (!initialRequest || typeof initialRequest !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'initialRequest is required and must be a string'
      }, { status: 400 });
    }

    if (initialRequest.trim().length < 5) {
      return NextResponse.json({
        success: false,
        error: 'initialRequest is too short (minimum 5 characters)'
      }, { status: 400 });
    }

    logger.info(`📋 [REQUIREMENTS] Gathering requirements for: "${initialRequest.substring(0, 100)}..."`);
    logger.info(`🔧 [REQUIREMENTS] Mode: ${mode}`);

    const gatherer = getRequirementsGatherer();
    
    let detailedRequirements;
    
    if (mode === 'simplified') {
      // Fast path: AI analysis without conversation
      detailedRequirements = await gatherer.getSimplifiedRequirements(initialRequest);
    } else {
      // Full path: Conversational gathering
      detailedRequirements = await gatherer.gatherRequirements(initialRequest);
    }

    logger.info(`✅ [REQUIREMENTS] Successfully gathered requirements`);
    logger.info(`📊 [REQUIREMENTS] Project type: ${detailedRequirements.projectType}`);
    logger.info(`🎯 [REQUIREMENTS] Features: ${detailedRequirements.features.length}`);
    logger.info(`👥 [REQUIREMENTS] Target: ${detailedRequirements.targetAudience}`);

    return NextResponse.json({
      success: true,
      requirements: detailedRequirements,
      summary: {
        projectType: detailedRequirements.projectType,
        featureCount: detailedRequirements.features.length,
        hasDesignRequirements: !!detailedRequirements.designRequirements?.style,
        hasTechStack: Object.keys(detailedRequirements.techStack).length > 0,
        scope: detailedRequirements.scope,
        conversationLength: detailedRequirements.conversationHistory.length
      },
      message: `Requirements gathered successfully. Ready to spawn ${determineSuggestedAgents(detailedRequirements).join(', ')} agents.`
    });

  } catch (error) {
    logger.error('❌ [REQUIREMENTS] Failed to gather requirements:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific error types
    if (errorMessage.includes('API key')) {
      return NextResponse.json({
        success: false,
        error: 'Requirements gathering requires ANTHROPIC_API_KEY to be configured',
        hint: 'Add ANTHROPIC_API_KEY to your .env.local file'
      }, { status: 503 });
    }

    return NextResponse.json({
      success: false,
      error: `Failed to gather requirements: ${errorMessage}`
    }, { status: 500 });
  }
}

/**
 * Determine which agents should be spawned based on requirements
 */
function determineSuggestedAgents(requirements: any): string[] {
  const agents: string[] = [];
  const projectType = requirements.projectType?.toLowerCase() || '';
  const features = requirements.features?.join(' ').toLowerCase() || '';

  // Frontend needed?
  if (projectType.includes('web') || projectType.includes('dashboard') || features.includes('ui') || features.includes('frontend')) {
    agents.push('Frontend Developer');
  }

  // Backend needed?
  if (projectType.includes('api') || projectType.includes('backend') || features.includes('server') || features.includes('database')) {
    agents.push('Backend Developer');
  }

  // Testing needed?
  if (requirements.scope === 'full-featured' || features.includes('test')) {
    agents.push('QA Engineer');
  }

  // DevOps needed?
  if (features.includes('deploy') || features.includes('ci/cd') || features.includes('docker')) {
    agents.push('DevOps Engineer');
  }

  // Default to full-stack if nothing specific
  if (agents.length === 0) {
    agents.push('Frontend Developer', 'Backend Developer');
  }

  return agents;
}
