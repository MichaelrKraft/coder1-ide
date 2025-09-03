import { NextRequest, NextResponse } from 'next/server';
import { claudeAPI } from '@/services/claude-api';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { message, context, command } = await request.json();

    // Check if Claude API is configured
    if (!claudeAPI.isConfigured()) {
      return NextResponse.json(
        { error: 'Claude API key not configured. Please add CLAUDE_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    let response;

    if (command) {
      // Process terminal command
      response = await claudeAPI.processTerminalCommand(command, context);
      return NextResponse.json({ content: response });
    } else {
      // Regular message
      const claudeResponse = await claudeAPI.sendMessage(message, context);
      return NextResponse.json(claudeResponse);
    }

  } catch (error) {
    logger.error('Claude API route error:', error);
    
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
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}