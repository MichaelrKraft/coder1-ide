/**
 * Alpha Health Monitoring Proxy API
 * 
 * Next.js API route that proxies health monitoring requests to Express backend
 * Provides type-safe interface for frontend health dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/api-config';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const EXPRESS_BACKEND_URL = getApiUrl();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'summary';
    
    // Validate endpoint
    const allowedEndpoints = ['status', 'summary', 'history', 'metrics', 'config'];
    if (!allowedEndpoints.includes(endpoint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid endpoint' },
        { status: 400 }
      );
    }
    
    // Forward request to Express backend
    const response = await fetch(`${EXPRESS_BACKEND_URL}/api/alpha-health/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      logger.error(`Health monitoring request failed: ${response.status}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Health monitoring service unavailable',
          status: response.status 
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('Health monitoring proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to health monitoring service',
        fallback: {
          overall: 'unknown',
          message: 'Health monitoring service is not available'
        }
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const tier = searchParams.get('tier');
    
    let endpoint = '';
    let method = 'POST';
    
    // Determine endpoint based on action
    switch (action) {
      case 'start':
        endpoint = 'start';
        break;
      case 'stop':
        endpoint = 'stop';
        break;
      case 'check':
        if (!tier) {
          return NextResponse.json(
            { success: false, error: 'Tier parameter required for check action' },
            { status: 400 }
          );
        }
        endpoint = `check/${tier}`;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use start, stop, or check' },
          { status: 400 }
        );
    }
    
    // Forward request to Express backend
    const response = await fetch(`${EXPRESS_BACKEND_URL}/api/alpha-health/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      logger.error(`Health monitoring action failed: ${response.status}`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Health monitoring action '${action}' failed`,
          status: response.status 
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('Health monitoring action error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute health monitoring action' 
      },
      { status: 500 }
    );
  }
}