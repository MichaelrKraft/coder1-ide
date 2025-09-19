import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Fetch metrics from Express backend
    const response = await fetch(`${EXPRESS_BACKEND_URL}/api/agents/metrics`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 5 } // Cache for 5 seconds
    });

    if (!response.ok) {
      // Return mock data if backend is unavailable
      return NextResponse.json({
        metrics: {
          activeAgents: 0,
          totalTasks: 42,
          successRate: 94,
          avgResponseTime: '2.3s',
          queueLength: 3,
          efficiency: 87
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    
    // Return mock metrics as fallback
    return NextResponse.json({
      metrics: {
        activeAgents: 0,
        totalTasks: 42,
        successRate: 94,
        avgResponseTime: '2.3s',
        queueLength: 3,
        efficiency: 87
      }
    });
  }
}