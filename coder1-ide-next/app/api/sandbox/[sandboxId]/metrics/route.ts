/**
 * Sandbox Metrics API Route
 * Provides real-time metrics for sandbox performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSandboxMetricsService } from '@/services/sandbox-metrics-service';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    sandboxId: string;
  };
}

// GET /api/sandbox/[sandboxId]/metrics - Get current metrics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const metricsService = getSandboxMetricsService();
    const metrics = metricsService.getMetrics(params.sandboxId);
    
    if (!metrics) {
      return NextResponse.json(
        { success: false, error: 'No metrics available for this sandbox' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      metrics: {
        sandboxId: metrics.sandboxId,
        timestamp: metrics.timestamp,
        cpuUsage: metrics.system.cpuUsage,
        memoryUsage: metrics.system.memoryUsage,
        responseTime: metrics.performance.responseTime,
        bundleSize: metrics.build.bundleSize,
        lighthouse: metrics.lighthouse,
        system: metrics.system,
        performance: metrics.performance,
        build: metrics.build,
        git: metrics.git
      }
    });
  } catch (error) {
    logger.error('Error getting sandbox metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get metrics' 
      },
      { status: 500 }
    );
  }
}

// POST /api/sandbox/[sandboxId]/metrics/start - Start metrics collection
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { sandboxPath } = body;
    
    if (!sandboxPath) {
      return NextResponse.json(
        { success: false, error: 'Sandbox path is required' },
        { status: 400 }
      );
    }
    
    const metricsService = getSandboxMetricsService();
    metricsService.startCollecting(params.sandboxId, sandboxPath);
    
    return NextResponse.json({
      success: true,
      message: 'Metrics collection started'
    });
  } catch (error) {
    logger.error('Error starting metrics collection:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start metrics collection' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/sandbox/[sandboxId]/metrics - Stop metrics collection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const metricsService = getSandboxMetricsService();
    metricsService.stopCollecting(params.sandboxId);
    
    return NextResponse.json({
      success: true,
      message: 'Metrics collection stopped'
    });
  } catch (error) {
    logger.error('Error stopping metrics collection:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to stop metrics collection' 
      },
      { status: 500 }
    );
  }
}