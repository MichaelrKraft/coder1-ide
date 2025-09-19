import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';

/**
 * GET /api/claude-bridge/teams
 * Get all active Claude Code Bridge teams
 */
export async function GET(request: NextRequest) {
  try {
    const bridgeService = getClaudeCodeBridgeService();
    const teams = bridgeService.getAllTeams();
    
    const compatibleTeams = teams.map(team => {
      const overallProgress = team.progress.overall;
      
      return {
        teamId: team.teamId,
        sessionId: team.sessionId,
        status: team.status,
        agentCount: team.agents.length,
        progress: overallProgress,
        createdAt: team.createdAt.getTime(),
        startedAt: team.startedAt?.getTime(),
        completedAt: team.completedAt?.getTime(),
        duration: team.startedAt ? 
          (team.completedAt?.getTime() || Date.now()) - team.startedAt.getTime() : 0,
        workflow: team.workflow,
        requirement: team.projectRequirement,
        generatedFiles: team.files || team.agents.reduce((sum, a) => sum + a.files, 0),
        activeAgents: team.agents.filter(a => a.status === 'working').length,
        completedAgents: team.agents.filter(a => a.status === 'completed').length,
        automatedExecution: team.context?.automated || false
      };
    });
    
    logger.debug(`📋 [BRIDGE] Listed ${teams.length} cost-free teams`);
    
    return NextResponse.json({
      success: true,
      teams: compatibleTeams,
      total: compatibleTeams.length,
      realTimeData: {
        totalActiveTeams: compatibleTeams.filter(t => t.status === 'working' || t.status === 'ready').length,
        totalGeneratedFiles: compatibleTeams.reduce((sum, t) => sum + t.generatedFiles, 0),
        totalActiveAgents: compatibleTeams.reduce((sum, t) => sum + t.activeAgents, 0),
        totalCostSavings: compatibleTeams.length * 0.30, // Estimated savings per team
        lastUpdate: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('❌ [BRIDGE] List teams error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to list bridge teams: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}