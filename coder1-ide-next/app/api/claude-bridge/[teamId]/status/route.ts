import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';

/**
 * GET /api/claude-bridge/status/[teamId]
 * Get status of a specific Claude Code Bridge team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    
    if (!teamId) {
      return NextResponse.json({
        success: false,
        error: 'Team ID is required'
      }, { status: 400 });
    }

    const bridgeService = getClaudeCodeBridgeService();
    const team = bridgeService.getTeamStatus(teamId);
    
    if (!team) {
      return NextResponse.json({
        success: false,
        error: 'Team not found'
      }, { status: 404 });
    }
    
    // Transform to compatible format
    const compatibleTeam = {
      teamId: team.teamId,
      sessionId: team.sessionId,
      status: team.status,
      agents: team.agents.map((agent, index) => ({
        id: `agent_${index + 1}`,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        progress: agent.progress,
        currentTask: agent.currentTask,
        completedTasks: agent.completedTasks,
        expertise: [],
        output: `Working in: ${agent.workTreePath}`,
        files: agent.files
      })),
      progress: team.progress,
      workflow: team.workflow,
      requirement: team.projectRequirement,
      context: team.context,
      files: team.files,
      generatedFiles: team.files || team.agents.reduce((sum, a) => sum + a.files, 0),
      createdAt: team.createdAt.getTime(),
      startedAt: team.startedAt?.getTime(),
      completedAt: team.completedAt?.getTime()
    };
    
    logger.debug(`📊 [BRIDGE] Status check: ${teamId} - ${team.status} (${team.progress.overall}% complete)`);
    
    return NextResponse.json({
      success: true,
      team: compatibleTeam,
      realTimeData: {
        activeAgents: team.agents.filter(a => a.status === 'working').length,
        completedAgents: team.agents.filter(a => a.status === 'completed').length,
        generatedFiles: team.files || 0,
        workflow: team.workflow,
        lastUpdate: new Date().toISOString(),
        automatedExecution: team.context?.automated || false
      }
    });
    
  } catch (error) {
    logger.error('❌ [BRIDGE] Status error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to get team status: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}