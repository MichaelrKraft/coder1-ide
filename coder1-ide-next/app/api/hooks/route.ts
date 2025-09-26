/**
 * Hooks API Route
 * Handles CRUD operations for automation hooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { hooksService } from '@/services/hooks-service';
import { logger } from '@/lib/logger';

// GET /api/hooks - Get all hooks
export async function GET(request: NextRequest) {
  try {
    const hooks = await hooksService.getAllHooks();
    
    return NextResponse.json({
      success: true,
      hooks,
      count: hooks.length
    });
  } catch (error: any) {
    logger.error('Failed to get hooks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve hooks'
      },
      { status: 500 }
    );
  }
}

// POST /api/hooks - Create a new hook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and prompt are required'
        },
        { status: 400 }
      );
    }
    
    const hook = await hooksService.createHook({
      name: body.name,
      description: body.description,
      trigger: body.trigger || 'manual',
      prompt: body.prompt,
      enabled: body.enabled !== false,
      category: body.category,
      confidence: body.confidence
    });
    
    return NextResponse.json({
      success: true,
      hook,
      message: 'Hook created successfully'
    });
  } catch (error: any) {
    logger.error('Failed to create hook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create hook'
      },
      { status: 500 }
    );
  }
}