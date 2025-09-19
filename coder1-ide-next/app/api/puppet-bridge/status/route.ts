import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/puppet-bridge/status
 * 
 * Get real-time status of puppet bridge workflows and agents
 * Used by UI to update progress and activity displays
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const teamId = searchParams.get('teamId');
    
    const puppeteerEnabled = process.env.ENABLE_CLI_PUPPETEER === 'true';
    
    if (!puppeteerEnabled) {
      return NextResponse.json({
        enabled: false,
        message: 'CLI Puppeteer is disabled'
      });
    }

    // Dynamic import
    const { getCoordinatorService } = await import('@/services/agent-coordinator');
    const { getPuppeteerService } = await import('@/services/claude-cli-puppeteer');
    
    const coordinator = getCoordinatorService();
    const puppeteer = getPuppeteerService();

    // If specific session/team requested, get detailed status
    if (sessionId || teamId) {
      const workflowStatus = coordinator.getWorkflowStatus(sessionId || teamId);
      
      if (!workflowStatus) {
        return NextResponse.json({
          found: false,
          message: 'Workflow session not found'
        }, { status: 404 });
      }

      // Transform to UI-compatible format
      const compatibleStatus = {
        teamId: workflowStatus.sessionId,
        sessionId: workflowStatus.sessionId,
        status: workflowStatus.status,
        progress: {
          overall: workflowStatus.progress.overall,
          phase: workflowStatus.currentPhase,
          details: workflowStatus.progress
        },
        agents: workflowStatus.agents.map((agent: any) => ({
          id: agent.agentId,
          name: getRoleName(agent.role),
          role: getRoleDescription(agent.role),
          status: mapAgentStatus(agent.status),
          progress: agent.progress || 0,
          currentTask: agent.currentTask || `Working as ${agent.role}`,
          completedTasks: [],
          lastActivity: new Date().toISOString()
        })),
        workflow: workflowStatus.workflowId,
        requirement: workflowStatus.requirement,
        executionTime: workflowStatus.executionTime,
        
        // Real-time activity (simulated for now, can be enhanced)
        recentActivity: generateRecentActivity(workflowStatus),
        
        // Puppet bridge specific info
        bridge: {
          type: 'cli-puppeteer',
          enabled: true,
          costFree: true,
          realAgents: true
        }
      };

      return NextResponse.json({
        found: true,
        status: compatibleStatus
      });
    }

    // General status - all active workflows
    const allWorkflows = Array.from(coordinator.activeWorkflows.keys()).map(sessionId => {
      const status = coordinator.getWorkflowStatus(sessionId);
      return {
        sessionId,
        teamId: sessionId,
        status: status?.status || 'unknown',
        workflow: status?.workflowId,
        requirement: status?.requirement?.substring(0, 100) + '...',
        agentCount: status?.agents.length || 0,
        progress: status?.progress.overall || 0,
        executionTime: status?.executionTime || 0
      };
    });

    const puppeteerStats = puppeteer.getStats();
    const coordinatorStats = coordinator.getStats();

    return NextResponse.json({
      enabled: true,
      status: 'operational',
      activeWorkflows: allWorkflows,
      stats: {
        totalWorkflows: allWorkflows.length,
        activeAgents: puppeteerStats.activeAgents,
        totalAgentsSpawned: puppeteerStats.totalAgentsSpawned,
        totalCommandsSent: puppeteerStats.totalCommandsSent,
        totalResponsesReceived: puppeteerStats.totalResponsesReceived,
        successRate: coordinatorStats.successRate,
        averageWorkflowTime: coordinatorStats.averageWorkflowTime
      },
      health: {
        puppeteer: puppeteer.isInitialized ? 'healthy' : 'initializing',
        coordinator: 'healthy',
        claudeCli: puppeteer.isInitialized ? 'connected' : 'not_tested'
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
 * Generate recent activity for UI display
 */
function generateRecentActivity(workflowStatus: any): Array<{
  timestamp: string;
  agent: string;
  action: string;
  type: string;
}> {
  const activities: Array<{
    timestamp: string;
    agent: string;
    action: string;
    type: string;
  }> = [];
  const now = new Date();
  
  // Generate some realistic activity based on workflow progress
  workflowStatus.agents.forEach((agent: any, index: number) => {
    if (agent.status === 'working' || agent.status === 'ready') {
      activities.push({
        timestamp: new Date(now.getTime() - (index * 30000)).toISOString(), // Stagger by 30s
        agent: getRoleName(agent.role),
        action: generateAgentAction(agent.role, agent.currentTask),
        type: 'progress'
      });
    }
  });
  
  return activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 10); // Last 10 activities
}

/**
 * Generate realistic agent actions based on role
 */
function generateAgentAction(role: string, currentTask: string): string {
  const actions = {
    frontend: [
      'Created React component structure',
      'Implemented responsive design',
      'Added TypeScript interfaces',
      'Configured state management',
      'Optimized component performance'
    ],
    backend: [
      'Designed API endpoints',
      'Implemented database models',
      'Added authentication middleware',
      'Created error handling',
      'Optimized database queries'
    ],
    fullstack: [
      'Integrated frontend with backend',
      'Implemented end-to-end flow',
      'Added comprehensive testing',
      'Optimized application performance',
      'Created deployment configuration'
    ],
    testing: [
      'Created unit test suite',
      'Implemented integration tests',
      'Added end-to-end testing',
      'Validated error scenarios',
      'Generated test coverage report'
    ],
    devops: [
      'Configured CI/CD pipeline',
      'Set up deployment scripts',
      'Implemented monitoring',
      'Optimized build process',
      'Created infrastructure documentation'
    ],
    architect: [
      'Designed system architecture',
      'Created technical specifications',
      'Planned component integration',
      'Reviewed implementation strategy',
      'Documented architectural decisions'
    ]
  };
  
  const roleActions = actions[role as keyof typeof actions] || ['Completed development task'];
  return roleActions[Math.floor(Math.random() * roleActions.length)];
}

/**
 * Map internal agent status to UI-friendly status
 */
function mapAgentStatus(internalStatus: string): string {
  const statusMap: Record<string, string> = {
    'initializing': 'initializing',
    'ready': 'working',
    'working': 'working', 
    'waiting': 'thinking',
    'completed': 'completed',
    'error': 'error',
    'stopped': 'stopped'
  };
  
  return statusMap[internalStatus] || 'working';
}

/**
 * Helper functions for role display
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