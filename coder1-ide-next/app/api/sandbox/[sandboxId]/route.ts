/**
 * Sandbox-specific API Routes - Simplified Working Version
 */

import { NextRequest, NextResponse } from 'next/server';
import * as tmuxServer from '@/lib/enhanced-tmux-server';
import { logger } from '@/lib/logger';
import { requireUser } from '@/lib/auth/request-auth';

interface RouteParams {
  params: {
    sandboxId: string;
  };
}

/**
 * SECURITY (C1): the sandbox routes execute shell commands and manipulate
 * sandboxes, so every method must (1) require a verified user and (2) confirm
 * that user owns the target sandbox. Returns the loaded sandbox on success, or
 * a ready-to-return NextResponse (401/403/404) on failure.
 */
async function authorizeSandbox(
  request: NextRequest,
  sandboxId: string
): Promise<{ sandbox: tmuxServer.SandboxSession } | { response: NextResponse }> {
  const auth = requireUser(request);
  if (auth.response) return { response: auth.response };

  const sandbox = await tmuxServer.getSandbox(sandboxId);
  if (!sandbox) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Sandbox not found' },
        { status: 404 }
      ),
    };
  }

  if (sandbox.userId !== auth.userId) {
    // Do not distinguish "not yours" from "not found" to avoid ID enumeration.
    return {
      response: NextResponse.json(
        { success: false, error: 'Sandbox not found' },
        { status: 404 }
      ),
    };
  }

  return { sandbox };
}

// GET /api/sandbox/[sandboxId] - Get sandbox details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authz = await authorizeSandbox(request, params.sandboxId);
    if ('response' in authz) return authz.response;
    const { sandbox } = authz;

    return NextResponse.json({
      success: true,
      sandbox: {
        id: sandbox.id,
        projectId: sandbox.projectId,
        path: sandbox.path,
        tmuxSession: sandbox.tmuxSession,
        status: sandbox.status,
        createdAt: sandbox.createdAt,
        lastActivity: sandbox.lastActivity,
        resources: sandbox.resources,
        processCount: sandbox.processes.length
      }
    });
  } catch (error) {
    logger.error('Error getting sandbox:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get sandbox' 
      },
      { status: 500 }
    );
  }
}

// POST /api/sandbox/[sandboxId] - Execute command in sandbox
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authz = await authorizeSandbox(request, params.sandboxId);
    if ('response' in authz) return authz.response;

    const body = await request.json();
    const { command, action } = body;

    // Handle different actions
    switch (action) {
      case 'run':
        if (!command) {
          return NextResponse.json(
            { success: false, error: 'Command is required' },
            { status: 400 }
          );
        }
        
        const result = await tmuxServer.runInSandbox(params.sandboxId, command);
        return NextResponse.json({
          success: true,
          result
        });
      
      case 'test':
        const testResults = await tmuxServer.testSandbox(params.sandboxId);
        return NextResponse.json({
          success: true,
          test: testResults
        });
      
      case 'promote':
        const targetPath = body.targetPath;
        await tmuxServer.promoteSandbox(params.sandboxId, targetPath);
        return NextResponse.json({
          success: true,
          message: 'Sandbox promoted to main workspace'
        });
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error executing in sandbox:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute in sandbox' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/sandbox/[sandboxId] - Destroy specific sandbox
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authz = await authorizeSandbox(request, params.sandboxId);
    if ('response' in authz) return authz.response;

    await tmuxServer.destroySandbox(params.sandboxId);

    return NextResponse.json({
      success: true,
      message: `Sandbox ${params.sandboxId} destroyed`
    });
  } catch (error) {
    logger.error('Error destroying sandbox:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to destroy sandbox' 
      },
      { status: 500 }
    );
  }
}