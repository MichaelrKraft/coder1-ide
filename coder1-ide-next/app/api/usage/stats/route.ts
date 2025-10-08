/**
 * Usage Stats API Endpoint
 * Returns real usage data from agents/data/cost-tracker.json
 */

import { NextResponse } from 'next/server';
import { usageService } from '@/lib/usage-service';

export async function GET() {
  try {
    const stats = await usageService.getDashboardStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in usage stats API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
