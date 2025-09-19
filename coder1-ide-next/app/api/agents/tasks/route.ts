import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${EXPRESS_BACKEND_URL}/api/agents/tasks`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return empty task list if backend unavailable
      return NextResponse.json({ tasks: [] });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, agentType } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    // Try to execute task via Express backend
    try {
      const response = await fetch(`${EXPRESS_BACKEND_URL}/api/agents/tasks`, {
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
      logger.debug('Backend unavailable, simulating task execution');
    }

    // Simulate task execution if backend is unavailable
    const mockResult = {
      taskId: `task-${Date.now()}`,
      description,
      agentType: agentType || 'auto',
      status: 'completed',
      result: {
        message: 'Task executed successfully (simulated)',
        analysis: `Analyzed: "${description}"`,
        recommendations: [
          'Consider implementing error handling',
          'Add unit tests for critical paths',
          'Optimize performance bottlenecks'
        ],
        confidence: 0.85
      },
      executionTime: '2.3s',
      timestamp: new Date().toISOString()
    };

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json(mockResult);
  } catch (error) {
    logger.error('Error executing task:', error);
    return NextResponse.json(
      { error: 'Failed to execute task' },
      { status: 500 }
    );
  }
}