import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Mark as dynamic since metrics change frequently
export const dynamic = 'force-dynamic';

// In-memory metrics storage (resets on server restart)
// In production, this would come from a database or metrics service
let metricsData = {
  activeAgents: 0,
  totalTasks: 42,
  successRate: 94,
  avgResponseTime: '2.3s',
  queueLength: 3,
  efficiency: 87,
  lastUpdated: Date.now()
};

export async function GET(request: NextRequest) {
  try {
    // Return current metrics directly - no external fetch needed
    // This was previously causing infinite recursion by fetching from itself
    return NextResponse.json({
      metrics: {
        ...metricsData,
        lastUpdated: new Date(metricsData.lastUpdated).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);

    // Return fallback metrics
    return NextResponse.json({
      metrics: {
        activeAgents: 0,
        totalTasks: 0,
        successRate: 0,
        avgResponseTime: 'N/A',
        queueLength: 0,
        efficiency: 0
      }
    });
  }
}

// POST endpoint to update metrics (called by agent services)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Update metrics with provided values
    metricsData = {
      ...metricsData,
      ...body,
      lastUpdated: Date.now()
    };

    return NextResponse.json({ success: true, metrics: metricsData });
  } catch (error) {
    logger.error('Error updating metrics:', error);
    return NextResponse.json({ success: false, error: 'Failed to update metrics' }, { status: 500 });
  }
}