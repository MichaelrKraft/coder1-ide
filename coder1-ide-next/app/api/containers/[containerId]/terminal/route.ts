/**
 * Container Terminal API Routes
 * 
 * Endpoints:
 * POST /api/containers/[containerId]/terminal - Attach to container terminal
 * GET  /api/containers/[containerId]/diff - Get container changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { containerService } from '@/services/container-use-service';
import { logger } from '@/lib/logger';

// POST /api/containers/[containerId]/terminal - Attach to container terminal
export async function POST(
  request: NextRequest,
  { params }: { params: { containerId: string } }
) {
  try {
    const { containerId } = params;
    
    logger.debug(`🔌 Attaching terminal to container: ${containerId}`);
    
    const terminal = await containerService.attachToContainer(containerId);
    
    return NextResponse.json({
      success: true,
      message: `Terminal attached to container ${containerId}`,
      pid: terminal.pid
    });

  } catch (error) {
    logger.error(`❌ Error attaching terminal:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to attach terminal'
    }, { status: 500 });
  }
}

// GET /api/containers/[containerId]/diff - Get container changes
export async function GET(
  request: NextRequest,
  { params }: { params: { containerId: string } }
) {
  try {
    const { containerId } = params;
    
    logger.debug(`📋 Getting diff for container: ${containerId}`);
    
    const diff = await containerService.getContainerDiff(containerId);
    
    return NextResponse.json({
      success: true,
      diff,
      containerId
    });

  } catch (error) {
    logger.error(`❌ Error getting container diff:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get container diff'
    }, { status: 500 });
  }
}