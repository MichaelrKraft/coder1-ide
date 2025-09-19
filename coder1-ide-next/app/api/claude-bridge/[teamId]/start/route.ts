import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';

/**
 * POST /api/claude-bridge/[teamId]/start
 * Start monitoring for a Claude Code Bridge team (automated execution is already started)
 */
export async function POST(
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

    // For automated bridge teams, monitoring is already started
    // This endpoint maintains compatibility with the existing API
    if (team.status === 'ready') {
      await bridgeService.startMonitoring(teamId);
    }

    // Transform to compatible format
    const compatibleAgents = team.agents.map((agent, index) => ({
      id: `agent_${index + 1}`,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      progress: agent.progress,
      currentTask: agent.currentTask,
      completedTasks: agent.completedTasks,
      expertise: []
    }));
    
    logger.info(`🚀 [BRIDGE] Monitoring confirmed for team: ${teamId}`);
    logger.info(`🤖 [BRIDGE] Automated execution: ${team.agents.length} agents running`);
    
    return NextResponse.json({
      success: true,
      teamId,
      agents: compatibleAgents,
      status: team.status,
      workflow: team.workflow,
      requirement: team.projectRequirement,
      message: `Automated AI Team monitoring confirmed - ${team.workflow} workflow executing`,
      automatedExecution: true,
      costSavings: true
    });
    
  } catch (error) {
    logger.error('❌ [BRIDGE] Start monitoring error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to start team monitoring: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}