import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Try to spawn agent via Express backend
    try {
      const response = await fetch(`${EXPRESS_BACKEND_URL}/api/agents/spawn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      logger.debug('Backend unavailable, using mock agent');
    }

    // Return mock agent if backend is unavailable
    const mockAgent = {
      id: `agent-${Date.now()}`,
      name: `Agent ${Math.floor(Math.random() * 1000)}`,
      role: body.type || 'architect',
      status: 'idle',
      currentTask: null,
      progress: 0,
      responseTime: null,
      confidence: null,
      lastActive: new Date().toLocaleTimeString()
    };

    return NextResponse.json(mockAgent);
  } catch (error) {
    logger.error('Error spawning agent:', error);
    return NextResponse.json(
      { error: 'Failed to spawn agent' },
      { status: 500 }
    );
  }
}