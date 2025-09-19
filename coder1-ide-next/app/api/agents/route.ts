import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Try to fetch from Express backend
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${EXPRESS_BACKEND_URL}/api/agents`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      logger.debug('Backend unavailable, using mock agents');
    }

    // Return mock agents if backend is unavailable
    const mockAgents = [
      {
        id: 'agent-1',
        name: 'Code Architect',
        role: 'architect',
        status: 'thinking',
        currentTask: 'Analyzing system architecture',
        progress: 45,
        responseTime: '1.2s',
        confidence: 92,
        lastActive: '2 min ago'
      },
      {
        id: 'agent-2',
        name: 'Frontend Specialist',
        role: 'frontend',
        status: 'working',
        currentTask: 'Building React components',
        progress: 78,
        responseTime: '0.8s',
        confidence: 88,
        lastActive: 'Just now'
      },
      {
        id: 'agent-3',
        name: 'Test Engineer',
        role: 'tester',
        status: 'idle',
        currentTask: null,
        progress: 0,
        responseTime: null,
        confidence: null,
        lastActive: '5 min ago'
      }
    ];

    return NextResponse.json({ agents: mockAgents });
  } catch (error) {
    logger.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', agents: [] },
      { status: 500 }
    );
  }
}