import { NextRequest, NextResponse } from 'next/server';
import { tokenTracker } from '@/services/token-tracker';

export async function GET(request: NextRequest) {
  try {
    const currentUsage = await tokenTracker.getCurrentUsage();
    
    if (!currentUsage) {
      // Return empty/default usage data if no data exists yet
      const today = new Date().toISOString().split('T')[0];
      return NextResponse.json({
        date: today,
        snapshots: [],
        totalTokens: 0,
        totalCost: 0,
        sessions: 0,
        commands: {},
        peakBurnRate: 0,
        averageBurnRate: 0,
        codingTime: 0,
        linesWritten: 0,
        tasksCompleted: 0
      });
    }

    return NextResponse.json(currentUsage);
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, sessionId, estimatedTokens } = body;

    if (!command || !sessionId) {
      return NextResponse.json(
        { error: 'Command and sessionId are required' },
        { status: 400 }
      );
    }

    await tokenTracker.trackCommand(command, sessionId, estimatedTokens);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking token usage:', error);
    return NextResponse.json(
      { error: 'Failed to track token usage' },
      { status: 500 }
    );
  }
}