/**
 * Sandbox API Routes - Working Version for IDE Beta  
 * Connected to real tmux service for terminal sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as tmuxServer from '@/lib/enhanced-tmux-server';

// GET /api/sandbox - List user's sandboxes
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    // Get sandboxes from real tmux service
    const userSandboxes = await tmuxServer.listUserSandboxes(userId);
    
    return NextResponse.json({
      success: true,
      sandboxes: userSandboxes,
      count: userSandboxes.length
    });
  } catch (error) {
    logger.error('Error listing sandboxes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list sandboxes' 
      },
      { status: 500 }
    );
  }
}

// POST /api/sandbox - Create new sandbox
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    const { projectId } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Check sandbox limit
    const userSandboxes = await tmuxServer.listUserSandboxes(userId);
    if (userSandboxes.length >= 15) {
      return NextResponse.json(
        { success: false, error: 'Maximum sandbox limit (15) reached' },
        { status: 400 }
      );
    }
    
    // Create new sandbox using real tmux service
    const sandbox = await tmuxServer.createSandbox(userId, projectId);
    
    logger.info(`Created sandbox: ${sandbox.id} for project: ${projectId}`);
    
    return NextResponse.json({
      success: true,
      sandbox: {
        id: sandbox.id,
        projectId: sandbox.projectId,
        path: sandbox.path,
        tmuxSession: sandbox.tmuxSession,
        status: sandbox.status,
        createdAt: sandbox.createdAt,
        resources: sandbox.resources
      }
    });
  } catch (error) {
    logger.error('Error creating sandbox:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create sandbox' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/sandbox - Destroy all user sandboxes
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    // Get user's sandboxes and destroy them
    const userSandboxes = await tmuxServer.listUserSandboxes(userId);
    
    const destroyed = [];
    for (const sandbox of userSandboxes) {
      await tmuxServer.destroySandbox(sandbox.id);
      destroyed.push(sandbox.id);
    }
    
    return NextResponse.json({
      success: true,
      destroyed,
      count: destroyed.length
    });
  } catch (error) {
    logger.error('Error destroying sandboxes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to destroy sandboxes' 
      },
      { status: 500 }
    );
  }
}