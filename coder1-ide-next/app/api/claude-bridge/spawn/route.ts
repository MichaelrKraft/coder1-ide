import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';

/**
 * POST /api/claude-bridge/spawn
 * Spawn a new parallel development team using Claude Code Bridge (cost-free)
 */
export async function POST(request: NextRequest) {
  try {
    const { requirement, sessionId } = await request.json();
    
    if (!requirement) {
      return NextResponse.json({
        success: false,
        error: 'Project requirement is required'
      }, { status: 400 });
    }

    logger.info(`🚀 [BRIDGE] Spawning cost-free team for: "${requirement}"`);
    
    // Check for OAuth token
    if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      logger.error('❌ [BRIDGE] CLAUDE_CODE_OAUTH_TOKEN not found in environment');
      return NextResponse.json({
        success: false,
        error: 'OAuth token not configured. Please check .env.local file.'
      }, { status: 500 });
    }
    
    try {
      // Use real Claude Code Bridge implementation
      const bridgeService = getClaudeCodeBridgeService();
      
      // Check if service is initialized
      if (!bridgeService.isServiceInitialized()) {
        await bridgeService.initialize();
      }
      
      // Spawn the parallel team using tmux sandboxes
      const team = await bridgeService.spawnParallelTeam(requirement, sessionId);
      
      if (!team) {
        // No fallback - return real error
        logger.error('❌ [BRIDGE] Failed to spawn team - no mock fallback');
        return NextResponse.json({
          success: false,
          error: 'Failed to spawn AI team. Please check OAuth token and try again.'
        }, { status: 500 });
      }
      
      // Real team was successfully spawned - transform bridge team format to match expected API format
      const compatibleTeam = {
        teamId: team.teamId,
        sessionId: team.sessionId,
        projectRequirement: team.projectRequirement,
        workflow: team.workflow,
        status: team.status,
        agents: team.agents.map((agent, index) => ({
          id: `agent_${index + 1}`,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          progress: agent.progress,
          currentTask: agent.currentTask,
          completedTasks: agent.completedTasks,
          expertise: [] // Legacy field for compatibility
        })),
        createdAt: team.createdAt.getTime(),
        startedAt: team.startedAt?.getTime() || null,
        completedAt: team.completedAt?.getTime() || null,
        progress: team.progress,
        context: team.context,
        files: team.files,
        automatedExecution: true // Flag indicating this is automated
      };
      
      logger.info(`✅ [BRIDGE] Team spawned: ${team.teamId}`);
      logger.info(`🤖 [BRIDGE] Automated execution: ${team.agents.length} agents`);
      
      return NextResponse.json({
        success: true,
        teamId: team.teamId,
        sessionId: team.sessionId,
        agents: compatibleTeam.agents,
        status: team.status,
        workflow: team.workflow,
        requirement: requirement,
        context: team.context,
        message: `AI Team spawned with ${team.agents.length} automated agents`,
        executionType: 'automated-claude-code'
      });
      
    } catch (bridgeError) {
      logger.error('❌ [BRIDGE] Bridge service failed:', bridgeError);
      
      // Return error - no fallback for now to ensure we identify issues
      return NextResponse.json({
        success: false,
        error: `Bridge service failed: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`,
        fallbackAvailable: true
      }, { status: 500 });
    }
    
  } catch (error) {
    logger.error('❌ [BRIDGE] API error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to spawn bridge team: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}