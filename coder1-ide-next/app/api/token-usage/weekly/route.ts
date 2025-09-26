import { NextRequest, NextResponse } from 'next/server';
import { tokenTracker } from '@/services/token-tracker';

export async function GET(request: NextRequest) {
  try {
    const weeklyUsage = await tokenTracker.getWeeklyUsage();
    return NextResponse.json(weeklyUsage);
  } catch (error) {
    console.error('Error fetching weekly token usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly token usage data' },
      { status: 500 }
    );
  }
}