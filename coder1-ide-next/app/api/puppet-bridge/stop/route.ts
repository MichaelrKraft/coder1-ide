import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/puppet-bridge/stop
 * 
 * Emergency stop for puppet bridge workflows and agents
 * Safely terminates all Claude CLI processes and cleans up resources
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, teamId, reason } = body;
    
    const puppeteerEnabled = process.env.ENABLE_CLI_PUPPETEER === 'true';
    
    if (!puppeteerEnabled) {
      return NextResponse.json({
        success: false,
        message: 'CLI Puppeteer is disabled'
      });
    }

    logger.info(`🛑 [PUPPET-BRIDGE] Stop request: ${reason || 'User requested'}`);

    // Dynamic import
    const { getCoordinatorService } = await import('@/services/agent-coordinator');
    const { getPuppeteerService } = await import('@/services/claude-cli-puppeteer');
    
    const coordinator = getCoordinatorService();
    const puppeteer = getPuppeteerService();

    let stoppedItems = {
      workflows: 0,
      agents: 0,
      processes: 0
    };

    // Stop specific workflow/team if specified
    if (sessionId || teamId) {
      const targetId = sessionId || teamId;
      logger.info(`🛑 [PUPPET-BRIDGE] Stopping specific workflow: ${targetId}`);
      
      try {
        await coordinator.stopWorkflow(targetId);
        stoppedItems.workflows = 1;
        
        // Count stopped agents
        const workflowStatus = coordinator.getWorkflowStatus(targetId);
        if (workflowStatus) {
          stoppedItems.agents = workflowStatus.agents.length;
        }
        
        logger.info(`✅ [PUPPET-BRIDGE] Workflow stopped: ${targetId}`);
        
        return NextResponse.json({
          success: true,
          message: `Workflow ${targetId} stopped successfully`,
          stopped: stoppedItems,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        logger.error(`❌ [PUPPET-BRIDGE] Failed to stop workflow ${targetId}:`, error);
        
        return NextResponse.json({
          success: false,
          error: `Failed to stop workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    // Emergency stop all if no specific target
    logger.info('🚨 [PUPPET-BRIDGE] Emergency stop all - stopping all workflows and agents');
    
    try {
      // Get current stats before stopping
      const coordinatorStats = coordinator.getStats();
      const puppeteerStats = puppeteer.getStats();
      
      stoppedItems.workflows = coordinatorStats.activeWorkflows;
      stoppedItems.agents = puppeteerStats.activeAgents;
      
      // Stop all workflows (this will stop their agents too)
      const activeWorkflowIds = Array.from(coordinator.activeWorkflows.keys());
      const stopWorkflowPromises = activeWorkflowIds.map(workflowId => 
        coordinator.stopWorkflow(workflowId).catch((error: any) => {
          logger.error(`Failed to stop workflow ${workflowId}:`, error);
          return null;
        })
      );
      
      await Promise.all(stopWorkflowPromises);
      
      // Emergency stop all agents (in case any are orphaned)
      await puppeteer.emergencyStopAll();
      
      stoppedItems.processes = stoppedItems.agents; // PTY processes
      
      logger.info(`✅ [PUPPET-BRIDGE] Emergency stop complete - stopped ${stoppedItems.workflows} workflows, ${stoppedItems.agents} agents`);
      
      return NextResponse.json({
        success: true,
        message: 'Emergency stop completed successfully',
        stopped: stoppedItems,
        details: {
          reason: reason || 'Emergency stop requested',
          activeWorkflowsBefore: coordinatorStats.activeWorkflows,
          activeAgentsBefore: puppeteerStats.activeAgents,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('❌ [PUPPET-BRIDGE] Emergency stop failed:', error);
      
      return NextResponse.json({
        success: false,
        error: `Emergency stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        partialStop: stoppedItems,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    logger.error('🛑 [PUPPET-BRIDGE] Stop API error:', error);
    return NextResponse.json({
      success: false,
      error: `Stop request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

/**
 * GET /api/puppet-bridge/stop
 * 
 * Get information about stoppable workflows and agents
 */
export async function GET(request: NextRequest) {
  try {
    const puppeteerEnabled = process.env.ENABLE_CLI_PUPPETEER === 'true';
    
    if (!puppeteerEnabled) {
      return NextResponse.json({
        enabled: false,
        stoppable: []
      });
    }

    // Dynamic import
    const { getCoordinatorService } = await import('@/services/agent-coordinator');
    const { getPuppeteerService } = await import('@/services/claude-cli-puppeteer');
    
    const coordinator = getCoordinatorService();
    const puppeteer = getPuppeteerService();
    
    // Get all active workflows that can be stopped
    const activeWorkflows = Array.from(coordinator.activeWorkflows.keys()).map(sessionId => {
      const status = coordinator.getWorkflowStatus(sessionId);
      return {
        sessionId,
        teamId: sessionId,
        status: status?.status || 'unknown',
        workflow: status?.workflowId,
        requirement: status?.requirement?.substring(0, 60) + '...',
        agentCount: status?.agents.length || 0,
        executionTime: status?.executionTime || 0,
        canStop: ['starting', 'running', 'working'].includes(status?.status || '')
      };
    });

    const puppeteerStats = puppeteer.getStats();
    
    return NextResponse.json({
      enabled: true,
      stoppable: activeWorkflows,
      summary: {
        totalWorkflows: activeWorkflows.length,
        stoppableWorkflows: activeWorkflows.filter(w => w.canStop).length,
        totalAgents: puppeteerStats.activeAgents,
        totalProcesses: puppeteerStats.activeAgents // Each agent = 1 PTY process
      },
      emergencyStopAvailable: activeWorkflows.length > 0 || puppeteerStats.activeAgents > 0
    });
    
  } catch (error) {
    logger.error('🛑 [PUPPET-BRIDGE] Stop info failed:', error);
    return NextResponse.json({
      enabled: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}