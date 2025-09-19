import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Return mock agent status data
    // This can be enhanced later to fetch from a real agent orchestrator
    const agents = [
      {
        id: 'agent-1',
        name: 'Code Architect',
        role: 'architect',
        status: 'active',
        currentTask: 'Ready for tasks',
        progress: 0,
        responseTime: '1.2s',
        confidence: 95,
        lastActive: 'Just now',
        capabilities: ['System Design', 'Architecture Review', 'Code Structure'],
        metrics: {
          tasksCompleted: 42,
          successRate: 98,
          avgResponseTime: 1.2
        }
      },
      {
        id: 'agent-2',
        name: 'Frontend Specialist',
        role: 'frontend',
        status: 'idle',
        currentTask: null,
        progress: 0,
        responseTime: '0.8s',
        confidence: 92,
        lastActive: '2 min ago',
        capabilities: ['React', 'CSS', 'UI/UX'],
        metrics: {
          tasksCompleted: 38,
          successRate: 96,
          avgResponseTime: 0.8
        }
      },
      {
        id: 'agent-3',
        name: 'Backend Engineer',
        role: 'backend',
        status: 'idle',
        currentTask: null,
        progress: 0,
        responseTime: '1.0s',
        confidence: 90,
        lastActive: '5 min ago',
        capabilities: ['Node.js', 'Databases', 'APIs'],
        metrics: {
          tasksCompleted: 35,
          successRate: 94,
          avgResponseTime: 1.0
        }
      }
    ];

    logger.debug(`Returning ${agents.length} agent statuses`);

    return NextResponse.json({
      agents,
      timestamp: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    logger.error('Error fetching agent status:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch agent status',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}