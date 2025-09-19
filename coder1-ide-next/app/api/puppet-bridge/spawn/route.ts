import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/puppet-bridge/spawn
 * 
 * Puppet Bridge API - Alternative to Claude Code Bridge using CLI Puppeteer
 * Spawns real AI agents using Claude CLI automation for true autonomous development
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

    logger.info(`🎭 [PUPPET-BRIDGE] Spawning CLI agents for: "${requirement}"`);
    
    // Check feature flag
    const puppeteerEnabled = process.env.ENABLE_CLI_PUPPETEER === 'true';
    
    if (!puppeteerEnabled) {
      logger.warn('🎭 [PUPPET-BRIDGE] CLI Puppeteer disabled, falling back to mock mode');
      return NextResponse.json({
        success: false,
        error: 'CLI Puppeteer is disabled. Set ENABLE_CLI_PUPPETEER=true to enable real agents.',
        fallback: true
      }, { status: 503 });
    }

    // Dynamic import to avoid loading puppeteer services when disabled
    const { getCoordinatorService } = await import('@/services/agent-coordinator');
    
    try {
      const coordinator = getCoordinatorService();
      
      // Analyze requirement and select appropriate workflow
      const analysis = coordinator.analyzeRequirement(requirement);
      
      logger.info(`🎭 [PUPPET-BRIDGE] Selected workflow: ${analysis.workflowId} (confidence: ${analysis.confidence.toFixed(2)})`);
      logger.info(`🎭 [PUPPET-BRIDGE] Reasoning: ${analysis.reasoning}`);
      
      // Execute the workflow (this will happen asynchronously)
      const workflowPromise = coordinator.executeWorkflow(
        analysis.workflowId,
        requirement,
        {
          sessionId: sessionId || `puppet-${Date.now()}`,
          timeout: 600000 // 10 minutes
        }
      );

      // Don't wait for completion - return immediately with status
      // The UI will poll for updates via separate endpoints
      
      // Get initial status after brief delay to let agents spawn
      setTimeout(async () => {
        try {
          const status = coordinator.getWorkflowStatus(workflowPromise.sessionId);
          logger.info(`🎭 [PUPPET-BRIDGE] Workflow status after spawn: ${status?.status}`);
        } catch (error) {
          logger.error('🎭 [PUPPET-BRIDGE] Error getting initial status:', error);
        }
      }, 2000);

      // Transform to match existing API format for UI compatibility
      const compatibleResponse = {
        success: true,
        teamId: `puppet-${Date.now()}`,
        sessionId: sessionId || `puppet-session-${Date.now()}`,
        status: 'spawning',
        workflow: analysis.workflowId,
        requirement,
        
        // Agent information in expected format
        agents: analysis.template.phases.flatMap((phase: any) => phase.agents).map((role: any, index: number) => ({
          id: `puppet-${role}-${index}`,
          name: getRoleName(role),
          role: getRoleDescription(role),
          status: 'initializing',
          progress: 0,
          currentTask: `Setting up ${role} agent...`,
          completedTasks: [],
          expertise: [role]
        })),
        
        // Execution metadata
        executionType: 'puppet-bridge-cli',
        automatedExecution: true,
        costSavings: true, // No API costs, using Claude CLI
        estimatedTime: analysis.template.estimatedTime,
        
        // Context information
        context: {
          workflowTemplate: analysis.template.name,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          phases: analysis.template.phases.length
        },
        
        // UI display information
        message: `AI Team spawned with ${analysis.template.phases.flatMap((p: any) => p.agents).length} agents using CLI Puppeteer`,
        costFree: true
      };

      logger.info(`🎭 [PUPPET-BRIDGE] Team spawned successfully: ${compatibleResponse.teamId}`);
      logger.info(`🤖 [PUPPET-BRIDGE] Agents: ${compatibleResponse.agents.length} (${compatibleResponse.agents.map((a: any) => a.role).join(', ')})`);
      
      return NextResponse.json(compatibleResponse);
      
    } catch (puppeteerError) {
      logger.error('🎭 [PUPPET-BRIDGE] Puppeteer service failed:', puppeteerError);
      
      return NextResponse.json({
        success: false,
        error: `Puppeteer service failed: ${puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error'}`,
        details: {
          error: puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error',
          requirement,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    logger.error('🎭 [PUPPET-BRIDGE] API error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to spawn puppet team: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

/**
 * GET /api/puppet-bridge/spawn
 * 
 * Get puppet bridge status and available workflows
 */
export async function GET(request: NextRequest) {
  try {
    const puppeteerEnabled = process.env.ENABLE_CLI_PUPPETEER === 'true';
    
    if (!puppeteerEnabled) {
      return NextResponse.json({
        enabled: false,
        message: 'CLI Puppeteer is disabled. Set ENABLE_CLI_PUPPETEER=true to enable.',
        availableWorkflows: [],
        status: 'disabled'
      });
    }

    // Dynamic import
    const { getCoordinatorService } = await import('@/services/agent-coordinator');
    const { getPuppeteerService } = await import('@/services/claude-cli-puppeteer');
    
    const coordinator = getCoordinatorService();
    const puppeteer = getPuppeteerService();
    
    const availableWorkflows = coordinator.getAvailableWorkflows();
    const puppeteerStats = puppeteer.getStats();
    const coordinatorStats = coordinator.getStats();
    
    return NextResponse.json({
      enabled: true,
      status: puppeteer.isInitialized ? 'ready' : 'initializing',
      availableWorkflows,
      stats: {
        puppeteer: puppeteerStats,
        coordinator: coordinatorStats
      },
      capabilities: {
        maxConcurrentAgents: 5,
        supportedRoles: ['frontend', 'backend', 'fullstack', 'testing', 'devops', 'architect'],
        workflowTemplates: availableWorkflows.length,
        realTimeExecution: true,
        costFree: true
      }
    });
    
  } catch (error) {
    logger.error('🎭 [PUPPET-BRIDGE] Status check failed:', error);
    return NextResponse.json({
      enabled: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Helper function to get human-readable role names
 */
function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    frontend: 'Frontend Engineer',
    backend: 'Backend Engineer', 
    fullstack: 'Full-Stack Developer',
    testing: 'QA Engineer',
    devops: 'DevOps Engineer',
    architect: 'Software Architect'
  };
  
  return roleNames[role] || `${role.charAt(0).toUpperCase() + role.slice(1)} Developer`;
}

/**
 * Helper function to get role descriptions
 */
function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    frontend: 'React, TypeScript, UI/UX',
    backend: 'Node.js, APIs, Database',
    fullstack: 'Full-Stack Development',
    testing: 'Quality Assurance & Testing',
    devops: 'Deployment & Infrastructure',
    architect: 'System Design & Architecture'
  };
  
  return descriptions[role] || `${role.charAt(0).toUpperCase() + role.slice(1)} Development`;
}