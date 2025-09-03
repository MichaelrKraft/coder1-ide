import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = 'http://localhost:3000';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string; checkpointId: string } }
) {
  try {
    const { sessionId, checkpointId } = params;
    
    const response = await fetch(
      `${EXPRESS_BACKEND_URL}/api/sessions/${sessionId}/checkpoints/${checkpointId}/restore`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to restore checkpoint:', error);
      return NextResponse.json(
        { error: 'Failed to restore checkpoint' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Restore checkpoint API error:', error);
    return NextResponse.json(
      { error: 'Failed to restore checkpoint' },
      { status: 500 }
    );
  }
}