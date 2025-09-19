import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';

/**
 * POST /api/claude-bridge/[teamId]/merge
 * Merge completed work trees back to main branch
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

    logger.info(`🔀 [BRIDGE] Starting merge process for team: ${teamId}`);

    try {
      const mergeResult = await bridgeService.mergeTeamWork(teamId);
      
      if (mergeResult.success) {
        logger.info(`🎉 [BRIDGE] Merge completed: ${mergeResult.mergedBranches.length} branches merged`);
        
        return NextResponse.json({
          success: true,
          teamId,
          mergedBranches: mergeResult.mergedBranches,
          totalBranches: team.agents.length,
          workflow: team.workflow,
          generatedFiles: team.files || team.agents.reduce((sum, a) => sum + a.files, 0),
          duration: team.completedAt && team.startedAt ? 
            team.completedAt.getTime() - team.startedAt.getTime() : null,
          message: `Successfully merged ${mergeResult.mergedBranches.length} agent branches`,
          costSavings: true,
          automatedExecution: true
        });
      } else {
        throw new Error('Merge operation failed');
      }
      
    } catch (mergeError) {
      logger.error(`❌ [BRIDGE] Merge failed for team ${teamId}:`, mergeError);
      
      return NextResponse.json({
        success: false,
        error: `Merge failed: ${mergeError instanceof Error ? mergeError.message : 'Unknown error'}`,
        teamId,
        partialMerge: false
      }, { status: 500 });
    }
    
  } catch (error) {
    logger.error('❌ [BRIDGE] Merge API error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to merge team work: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}