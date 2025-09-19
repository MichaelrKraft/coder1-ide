import { NextRequest, NextResponse } from 'next/server';
import { metricsBaseline } from '@/services/metrics-baseline';

/**
 * GET /api/metrics/baseline - Get baseline statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await metricsBaseline.getStatistics();
    const hasEnoughData = metricsBaseline.hasEnoughData();
    
    return NextResponse.json({
      success: true,
      hasEnoughData,
      statistics: stats,
      message: hasEnoughData 
        ? 'Baseline data collection complete' 
        : 'Still collecting baseline data (48 hours required)',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get baseline metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve baseline metrics'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/metrics/baseline - Start or stop baseline collection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, intervalMs = 60000 } = body;
    
    if (action === 'start') {
      await metricsBaseline.startCollection(intervalMs);
      
      return NextResponse.json({
        success: true,
        message: 'Baseline collection started',
        intervalMs,
        expectedCompletion: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });
      
    } else if (action === 'stop') {
      await metricsBaseline.stopCollection();
      
      return NextResponse.json({
        success: true,
        message: 'Baseline collection stopped',
        statistics: await metricsBaseline.getStatistics()
      });
      
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use "start" or "stop"'
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Failed to control baseline collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to control baseline collection'
      },
      { status: 500 }
    );
  }
}