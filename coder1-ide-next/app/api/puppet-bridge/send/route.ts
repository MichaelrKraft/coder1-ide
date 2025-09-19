import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/puppet-bridge/send
 * 
 * Send messages or tasks to active puppet bridge agents
 * Used for real-time communication with running agents
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, teamId, message, agentId, taskType } = await request.json();
    
    if (!sessionId && !teamId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID or Team ID is required'
      }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 });
    }

    const targetSession = sessionId || teamId;
    logger.info(`🎭 [PUPPET-BRIDGE] Sending message to session: ${targetSession}`);
    
    const puppeteerEnabled = process.env.ENABLE_CLI_PUPPETEER === 'true';
    
    if (!puppeteerEnabled) {
      logger.warn('🎭 [PUPPET-BRIDGE] CLI Puppeteer disabled, cannot send message');
      return NextResponse.json({
        success: false,
        error: 'CLI Puppeteer is disabled. Set ENABLE_CLI_PUPPETEER=true to enable.',
        fallback: true
      }, { status: 503 });
    }

    // Dynamic import to avoid loading puppeteer services when disabled
    const { getCoordinatorService } = await import('@/services/agent-coordinator');
    const { getPuppeteerService } = await import('@/services/claude-cli-puppeteer');
    
    try {
      const coordinator = getCoordinatorService();
      const puppeteer = getPuppeteerService();
      
      // Check if workflow exists
      const workflowStatus = coordinator.getWorkflowStatus(targetSession);
      
      if (!workflowStatus) {
        return NextResponse.json({
          success: false,
          error: `Workflow session '${targetSession}' not found or has ended`
        }, { status: 404 });
      }

      if (workflowStatus.status === 'completed' || workflowStatus.status === 'stopped') {
        return NextResponse.json({
          success: false,
          error: `Cannot send message to ${workflowStatus.status} workflow`
        }, { status: 400 });
      }

      // Send message to specific agent or broadcast to all
      let result;
      
      if (agentId) {
        // Send to specific agent
        logger.info(`🎭 [PUPPET-BRIDGE] Sending to agent ${agentId}: ${message}`);
        result = await coordinator.sendToAgent(targetSession, agentId, message, taskType);
      } else {
        // Broadcast to all agents in the workflow
        logger.info(`🎭 [PUPPET-BRIDGE] Broadcasting to all agents: ${message}`);
        result = await coordinator.broadcastToWorkflow(targetSession, message, taskType);
      }

      // Update workflow status
      coordinator.updateWorkflowActivity(targetSession, {
        type: 'message_sent',
        agentId: agentId || 'all',
        message: message.substring(0, 100),
        taskType: taskType || 'message',
        timestamp: new Date().toISOString()
      });

      logger.info(`🎭 [PUPPET-BRIDGE] Message sent successfully to ${agentId || 'all agents'}`);

      return NextResponse.json({
        success: true,
        sessionId: targetSession,
        messageId: `msg-${Date.now()}`,
        sentTo: agentId || 'all_agents',
        status: 'delivered',
        
        // Result information
        result: {
          agentsReached: agentId ? 1 : workflowStatus.agents.length,
          deliveryTime: new Date().toISOString(),
          taskType: taskType || 'message'
        },
        
        // Update workflow info
        workflowStatus: {
          sessionId: workflowStatus.sessionId,
          status: workflowStatus.status,
          agentCount: workflowStatus.agents.length,
          lastActivity: new Date().toISOString()
        }
      });
      
    } catch (puppeteerError) {
      logger.error('🎭 [PUPPET-BRIDGE] Message send failed:', puppeteerError);
      
      return NextResponse.json({
        success: false,
        error: `Failed to send message: ${puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error'}`,
        details: {
          sessionId: targetSession,
          error: puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    logger.error('🎭 [PUPPET-BRIDGE] Send API error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to process send request: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

/**
 * GET /api/puppet-bridge/send
 * 
 * Get information about message sending capabilities and recent activity
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    const puppeteerEnabled = process.env.ENABLE_CLI_PUPPETEER === 'true';
    
    if (!puppeteerEnabled) {
      return NextResponse.json({
        enabled: false,
        message: 'CLI Puppeteer is disabled'
      });
    }

    // Dynamic import
    const { getCoordinatorService } = await import('@/services/agent-coordinator');
    
    const coordinator = getCoordinatorService();

    if (sessionId) {
      // Get specific session message history
      const workflowStatus = coordinator.getWorkflowStatus(sessionId);
      
      if (!workflowStatus) {
        return NextResponse.json({
          found: false,
          message: 'Session not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        sessionId,
        canSendMessages: workflowStatus.status === 'running' || workflowStatus.status === 'working',
        agents: workflowStatus.agents.map((agent: any) => ({
          id: agent.agentId,
          role: agent.role,
          status: agent.status,
          canReceiveMessages: agent.status === 'working' || agent.status === 'ready'
        })),
        messageHistory: workflowStatus.messageHistory || [],
        lastActivity: workflowStatus.lastActivity
      });
    }

    // General send capabilities
    const activeWorkflows = Array.from(coordinator.activeWorkflows.keys());
    
    return NextResponse.json({
      enabled: true,
      activeWorkflows: activeWorkflows.length,
      capabilities: {
        broadcastMessage: true,
        targetSpecificAgent: true,
        supportedTaskTypes: ['message', 'task', 'instruction', 'feedback'],
        maxMessageLength: 5000
      },
      stats: coordinator.getStats()
    });
    
  } catch (error) {
    logger.error('🎭 [PUPPET-BRIDGE] Send info check failed:', error);
    return NextResponse.json({
      enabled: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}