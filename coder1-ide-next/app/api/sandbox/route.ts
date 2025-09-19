/**
 * Sandbox API Routes - Working Version for IDE Beta
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// For now, we'll use a simple in-memory store for demo purposes
// In production, this would connect to the real tmux service
let sandboxes = new Map();
let sandboxCounter = 1;

// GET /api/sandbox - List user's sandboxes
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    const userSandboxes = Array.from(sandboxes.values()).filter(
      (s: any) => s.userId === userId
    );
    
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
    const existingSandboxes = Array.from(sandboxes.values()).filter(
      (s: any) => s.userId === userId
    );
    if (existingSandboxes.length >= 15) {
      return NextResponse.json(
        { success: false, error: 'Maximum sandbox limit (15) reached' },
        { status: 400 }
      );
    }
    
    // Create new sandbox
    const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sandbox = {
      id: sandboxId,
      userId,
      projectId,
      path: `/tmp/coder1-workspaces/${userId}/sandboxes/${sandboxId}`,
      tmuxSession: `sandbox_${sandboxId}`,
      status: 'ready',
      createdAt: new Date(),
      lastActivity: new Date(),
      resources: {
        cpuUsage: Math.floor(Math.random() * 30),
        memoryUsage: Math.floor(Math.random() * 500) + 200,
        diskUsage: Math.floor(Math.random() * 100) + 50
      },
      processes: []
    };
    
    sandboxes.set(sandboxId, sandbox);
    sandboxCounter++;
    
    logger.info(`Created sandbox: ${sandboxId} for project: ${projectId}`);
    
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
    
    const destroyed = [];
    for (const [id, sandbox] of sandboxes.entries()) {
      if ((sandbox as any).userId === userId) {
        sandboxes.delete(id);
        destroyed.push(id);
      }
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