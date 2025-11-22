import { NextRequest, NextResponse } from 'next/server';
import aiOrchestrator from '@/services/ai-agent-orchestrator';
import { logger } from '@/lib/logger';

/**
 * GET /api/agents/[teamId]/[agentId]/prompt
 * Get the specialized task prompt for a specific agent in a team
 * 
 * This endpoint bridges the backend orchestrator with frontend agent terminals.
 * When an agent terminal starts, it calls this endpoint to get its task.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string; agentId: string } }
) {
  try {
    const { teamId, agentId } = params;
    
    logger.debug(`📋 [AGENT PROMPT] Fetching prompt for agent ${agentId} in team ${teamId}`);
    
    // Get the agent's task prompt from the orchestrator
    const promptData = await aiOrchestrator.getAgentPrompt(teamId, agentId);
    
    if (!promptData) {
      logger.warn(`⚠️ [AGENT PROMPT] No prompt found for agent ${agentId} in team ${teamId}`);
      return NextResponse.json({
        success: false,
        error: 'Agent not found or task not assigned'
      }, { status: 404 });
    }
    
    logger.debug(`✅ [AGENT PROMPT] Returning prompt for ${promptData.agentName}`);
    
    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: promptData.agentName,
        role: promptData.role,
        status: promptData.status,
        currentTask: promptData.currentTask
      },
      prompt: promptData.prompt,
      context: promptData.context
    });
    
  } catch (error) {
    logger.error('❌ [AGENT PROMPT] Error fetching agent prompt:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to fetch agent prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
