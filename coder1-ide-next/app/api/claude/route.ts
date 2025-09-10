import { NextRequest, NextResponse } from 'next/server';
import { claudeCliService } from '@/services/claude-cli-service';

// CORS configuration for security - only allow specific origins
const ALLOWED_ORIGINS = [
  'https://coder1.app',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify origin to prevent malicious websites from accessing local server
    const origin = request.headers.get('origin');
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid origin' },
        { status: 403 }
      );
    }

    const { message, context, command, sessionId } = await request.json();

    // Check if Claude CLI is available
    if (!claudeCliService.isClaudeAvailable()) {
      return NextResponse.json(
        { 
          error: 'Claude CLI not available', 
          details: 'Please install Claude Code CLI from https://claude.ai/code',
          command: claudeCliService.getClaudeCommand()
        },
        { status: 503 }
      );
    }

    const session = sessionId || 'default';

    let response;

    if (command) {
      // Process terminal command
      response = await claudeCliService.processTerminalCommand(session, command, context);
      return NextResponse.json({ content: response });
    } else {
      // Regular message - create session if needed
      if (!claudeCliService.getSession(session)) {
        claudeCliService.createSession(session);
      }
      
      const claudeResponse = await claudeCliService.sendMessage(session, message, context);
      return NextResponse.json({ 
        content: claudeResponse,
        sessionId: session
      });
    }

  } catch (error) {
    console.error('Claude CLI route error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Check if origin is allowed
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[1]; // Default to localhost
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}