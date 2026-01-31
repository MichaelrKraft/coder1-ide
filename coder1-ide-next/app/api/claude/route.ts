import { NextRequest, NextResponse } from 'next/server';
import { claudeCliService } from '@/services/claude-cli-service';
import { sessionMemoryService } from '@/services/memory/session-memory-service';
import { features } from '@/lib/feature-flags';
import { MemoryMode } from '@/lib/memory-types';
import { handleError, errors } from '@/lib/error-handler';

// Mark as dynamic since this uses request data
export const dynamic = 'force-dynamic';

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

    const { message, context, command, sessionId, includeMemory = true } = await request.json();

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
    let enhancedMessage = message;
    let memoryContextUsed = '';

    // Inject memory context if enabled
    const featureFlags = features();
    if (featureFlags.memoryContextEnabled && includeMemory) {
      const memoryMode = sessionMemoryService.getMemoryMode();
      
      if (memoryMode !== MemoryMode.OFF) {
        try {
          // Get smart context based on the message
          const memoryContext = await sessionMemoryService.getSmartContext(message || command);
          
          if (memoryContext && memoryContext.totalTokens > 0) {
            const formattedContext = sessionMemoryService.formatContextForInjection(memoryContext);
            
            // Prepend memory context to the message
            if (formattedContext) {
              enhancedMessage = `${formattedContext}\n\n${message || command || ''}`;
              memoryContextUsed = formattedContext;
              console.log(`🧠 Memory context injected: ${memoryContext.totalTokens} tokens from ${memoryContext.sessionCount} sessions`);
            }
          }
        } catch (error) {
          console.warn('Failed to inject memory context:', error);
          // Continue without memory context if there's an error
        }
      }
    }

    if (command) {
      // Process terminal command with memory context
      response = await claudeCliService.processTerminalCommand(session, enhancedMessage, context);
      
      // Track the interaction in memory if enabled
      if (featureFlags.memoryContextEnabled && sessionMemoryService.getMemoryMode() !== MemoryMode.OFF) {
        await sessionMemoryService.addInteraction({
          platform: 'Claude Code',
          input: command,
          output: response,
          type: 'command'
        });
      }
      
      return NextResponse.json({ 
        content: response,
        memoryContextUsed: memoryContextUsed ? memoryContextUsed.length : 0
      });
    } else {
      // Regular message - create session if needed
      if (!claudeCliService.getSession(session)) {
        claudeCliService.createSession(session);
      }
      
      const claudeResponse = await claudeCliService.sendMessage(session, enhancedMessage, context);
      
      // Track the interaction in memory if enabled
      if (featureFlags.memoryContextEnabled && sessionMemoryService.getMemoryMode() !== MemoryMode.OFF) {
        await sessionMemoryService.addInteraction({
          platform: 'Claude Code',
          input: message,
          output: claudeResponse,
          type: 'response'
        });
      }
      
      return NextResponse.json({ 
        content: claudeResponse,
        sessionId: session,
        memoryContextUsed: memoryContextUsed ? memoryContextUsed.length : 0
      });
    }

  } catch (error) {
    const appError = handleError(error, {
      endpoint: 'POST /api/claude',
      action: 'claude_interaction'
    });

    return NextResponse.json(
      {
        error: appError.userMessage,
        errorId: appError.id,
        category: appError.category
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