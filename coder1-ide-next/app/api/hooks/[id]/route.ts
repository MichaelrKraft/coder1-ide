/**
 * Individual Hook API Route
 * Handles operations on specific hooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { hooksService } from '@/services/hooks-service';
import { logger } from '@/lib/logger';

// GET /api/hooks/[id] - Get a specific hook
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hook = await hooksService.getHook(params.id);
    
    if (!hook) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hook not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      hook
    });
  } catch (error: any) {
    logger.error(`Failed to get hook ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve hook'
      },
      { status: 500 }
    );
  }
}

// PUT /api/hooks/[id] - Update a hook
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const hook = await hooksService.updateHook(params.id, body);
    
    if (!hook) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hook not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      hook,
      message: 'Hook updated successfully'
    });
  } catch (error: any) {
    logger.error(`Failed to update hook ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update hook'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/hooks/[id] - Delete a hook
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await hooksService.deleteHook(params.id);
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hook not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Hook deleted successfully'
    });
  } catch (error: any) {
    logger.error(`Failed to delete hook ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete hook'
      },
      { status: 500 }
    );
  }
}

// POST /api/hooks/[id]/toggle - Toggle hook enabled state
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();
    
    if (action === 'toggle') {
      const hook = await hooksService.toggleHook(params.id);
      
      if (!hook) {
        return NextResponse.json(
          {
            success: false,
            error: 'Hook not found'
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        hook,
        message: `Hook ${hook.enabled ? 'enabled' : 'disabled'} successfully`
      });
    } else if (action === 'execute') {
      const execution = await hooksService.executeHook(params.id);
      
      return NextResponse.json({
        success: true,
        execution,
        message: 'Hook executed successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action'
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    logger.error(`Failed to perform action on hook ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to perform action'
      },
      { status: 500 }
    );
  }
}