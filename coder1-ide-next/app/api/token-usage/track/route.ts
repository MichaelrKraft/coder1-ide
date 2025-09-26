import { NextRequest, NextResponse } from 'next/server';
import { tokenTracker } from '@/services/token-tracker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, sessionId, estimatedTokens, responseSize } = body;

    if (!command || !sessionId) {
      return NextResponse.json(
        { error: 'Command and sessionId are required' },
        { status: 400 }
      );
    }

    // Track command or response
    if (responseSize) {
      await tokenTracker.trackResponse(responseSize, sessionId);
    } else {
      await tokenTracker.trackCommand(command, sessionId, estimatedTokens);
    }

    // Return current usage after tracking
    const currentUsage = await tokenTracker.getCurrentUsage();

    return NextResponse.json({ 
      success: true,
      currentUsage
    });
  } catch (error) {
    console.error('Error tracking token usage:', error);
    return NextResponse.json(
      { error: 'Failed to track token usage' },
      { status: 500 }
    );
  }
}