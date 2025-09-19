/**
 * Legacy Container API Routes - Redirects to Agent Sandbox System
 * 
 * These endpoints redirect to the sandbox system which provides
 * agent isolation using tmux instead of Docker containers.
 */

import { NextRequest, NextResponse } from 'next/server';

// GET /api/containers - Redirect to sandbox API
export async function GET(request: NextRequest) {
  // Redirect to the sandbox API which provides agent isolation
  return NextResponse.json({
    success: true,
    redirect: '/api/sandbox',
    message: 'Container system has been replaced with Agent Sandboxes. Please use the Agents tab in the Discover panel.',
    sandboxSystem: {
      enabled: true,
      type: 'tmux-based',
      features: [
        'Isolated agent environments',
        'Parallel task execution',
        'Resource monitoring',
        'Live output streaming'
      ]
    }
  });
}

// POST /api/containers - Redirect to sandbox creation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { agentType } = body;
  
  return NextResponse.json({
    success: true,
    redirect: '/api/sandbox',
    message: 'Please use the Agent Sandboxes system to spawn agents.',
    suggestion: {
      endpoint: '/api/sandbox',
      method: 'POST',
      body: {
        projectId: agentType || 'agent',
        agentType: agentType
      }
    }
  });
}

// DELETE /api/containers - Redirect to sandbox cleanup
export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: true,
    redirect: '/api/sandbox',
    message: 'Please use the Agent Sandboxes system for cleanup.',
    suggestion: {
      endpoint: '/api/sandbox',
      method: 'DELETE'
    }
  });
}