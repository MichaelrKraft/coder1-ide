import { NextRequest, NextResponse } from 'next/server';
import { metricsBaseline } from '@/services/metrics-baseline';

/**
 * POST /api/metrics/track - Track specific metric events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value, endpoint } = body;
    
    switch (type) {
      case 'session-creation':
        if (typeof value === 'number') {
          metricsBaseline.trackSessionCreation(value);
        }
        break;
        
      case 'api-response':
        if (typeof value === 'number' && endpoint) {
          metricsBaseline.trackApiResponse(endpoint, value);
        }
        break;
        
      case 'render-time':
        if (typeof value === 'number') {
          metricsBaseline.trackRenderTime(value);
        }
        break;
        
      case 'error':
        metricsBaseline.trackError();
        break;
        
      case 'request':
        metricsBaseline.trackRequest();
        break;
        
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown metric type: ${type}`
          },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      type,
      tracked: true
    });
    
  } catch (error) {
    console.error('Failed to track metric:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track metric'
      },
      { status: 500 }
    );
  }
}