/**
 * Individual Container Management API Routes
 * 
 * Endpoints:
 * GET    /api/containers/[containerId] - Get container status
 * DELETE /api/containers/[containerId] - Stop and remove container
 * PUT    /api/containers/[containerId] - Reset container
 */

import { NextRequest, NextResponse } from 'next/server';
import { containerService } from '@/services/container-use-service';
import { logger } from '@/lib/logger';

// GET /api/containers/[containerId] - Get container status
export async function GET(
  request: NextRequest,
  { params }: { params: { containerId: string } }
) {
  try {
    const { containerId } = params;
    
    logger.debug(`📊 Getting status for container: ${containerId}`);
    
    const container = await containerService.getContainerStatus(containerId);
    
    if (!container) {
      return NextResponse.json({
        success: false,
        error: 'Container not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      container
    });

  } catch (error) {
    logger.error(`❌ Error getting container status:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get container status'
    }, { status: 500 });
  }
}

// DELETE /api/containers/[containerId] - Stop and remove container
export async function DELETE(
  request: NextRequest,
  { params }: { params: { containerId: string } }
) {
  try {
    const { containerId } = params;
    
    logger.debug(`🗑️ Destroying container: ${containerId}`);
    
    await containerService.destroyContainer(containerId);

    return NextResponse.json({
      success: true,
      message: `Container ${containerId} destroyed successfully`
    });

  } catch (error) {
    logger.error(`❌ Error destroying container:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to destroy container'
    }, { status: 500 });
  }
}

// PUT /api/containers/[containerId] - Reset container
export async function PUT(
  request: NextRequest,
  { params }: { params: { containerId: string } }
) {
  try {
    const { containerId } = params;
    const body = await request.json();
    const { action } = body;
    
    logger.debug(`🔄 Container action: ${action} for ${containerId}`);
    
    switch (action) {
      case 'reset':
        const newContainer = await containerService.resetContainer(containerId);
        return NextResponse.json({
          success: true,
          container: newContainer,
          message: `Container ${containerId} reset successfully`
        });
        
      case 'merge':
        await containerService.mergeContainerWork(containerId);
        return NextResponse.json({
          success: true,
          message: `Container ${containerId} work merged successfully`
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Supported actions: reset, merge`
        }, { status: 400 });
    }

  } catch (error) {
    logger.error(`❌ Error performing container action:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform container action'
    }, { status: 500 });
  }
}