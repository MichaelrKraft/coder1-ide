import { NextRequest, NextResponse } from 'next/server';
import { safeguardMonitor } from '@/services/safeguard-monitor';

/**
 * GET /api/monitoring/health - Get current system health status
 */
export async function GET(request: NextRequest) {
  try {
    const status = safeguardMonitor.getCurrentStatus();
    
    if (!status) {
      // No health data yet, return default
      return NextResponse.json({
        success: true,
        overall: 'unknown',
        message: 'Health monitoring not yet initialized',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get health status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve health status'
      },
      { status: 500 }
    );
  }
}