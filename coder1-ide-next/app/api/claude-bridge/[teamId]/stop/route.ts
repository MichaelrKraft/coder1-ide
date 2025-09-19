import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';

/**
 * POST /api/claude-bridge/[teamId]/stop
 * Stop a Claude Code Bridge team and all its automated processes
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

    logger.info(`🛑 [BRIDGE] Stopping automated team: ${teamId}`);

    try {
      // Stop the team and all its processes
      await bridgeService.stopTeam(teamId);
      
      // Get updated team status
      const stoppedTeam = bridgeService.getTeamStatus(teamId);
      const duration = stoppedTeam?.completedAt && stoppedTeam?.startedAt ? 
        stoppedTeam.completedAt.getTime() - stoppedTeam.startedAt.getTime() : null;
      
      // Transform agents to compatible format
      const compatibleAgents = (stoppedTeam?.agents || team.agents).map((agent, index) => ({
        id: `agent_${index + 1}`,
        name: agent.name,
        role: agent.role,
        status: 'stopped',
        progress: agent.progress,
        currentTask: 'Stopped by user',
        completedTasks: agent.completedTasks,
        expertise: []
      }));
      
      logger.info(`✅ [BRIDGE] Team stopped: ${teamId} (Generated ${team.files || 0} files)`);
      
      return NextResponse.json({
        success: true,
        teamId,
        status: 'stopped',
        agents: compatibleAgents,
        duration,
        generatedFiles: team.files || team.agents.reduce((sum, a) => sum + a.files, 0),
        workflow: team.workflow,
        message: `Automated AI Team stopped - ${team.files || 0} files generated`,
        automatedExecution: true,
        costSavings: true
      });
      
    } catch (stopError) {
      logger.error(`❌ [BRIDGE] Stop failed for team ${teamId}:`, stopError);
      
      return NextResponse.json({
        success: false,
        error: `Stop operation failed: ${stopError instanceof Error ? stopError.message : 'Unknown error'}`,
        teamId
      }, { status: 500 });
    }
    
  } catch (error) {
    logger.error('❌ [BRIDGE] Stop API error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to stop team: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}