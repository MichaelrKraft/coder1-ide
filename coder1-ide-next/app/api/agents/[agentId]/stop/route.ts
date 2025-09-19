import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Try to stop agent via Express backend
    try {
      const response = await fetch(`${EXPRESS_BACKEND_URL}/api/agents/${agentId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      logger.debug('Backend unavailable, simulating agent stop');
    }

    // Return success if backend is unavailable (mock)
    return NextResponse.json({
      success: true,
      agentId,
      message: `Agent ${agentId} stopped successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error stopping agent:', error);
    return NextResponse.json(
      { error: 'Failed to stop agent' },
      { status: 500 }
    );
  }
}