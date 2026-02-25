/**
 * Johnny5 J5 Chat Route
 *
 * Uses the J5Bridge to send messages to ManusLive gateway.
 * This allows Johnny5 to communicate with the autonomous AI daemon
 * for 24/7 capabilities, session persistence, and cross-device sync.
 *
 * POST /api/johnny5/j5/chat
 * {
 *   "message": "Hello Johnny5!",
 *   "sessionKey": "dashboard:main"  // Optional, defaults to "dashboard:main"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJ5Bridge } from '@/services/johnny5/j5-bridge';
import type { Johnny5APIResponse, J5Response } from '@/types/johnny5';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  message: string;
  sessionKey?: string;
  history?: Array<{ role: string; content: string }>;
}

interface ChatSuccessResponse {
  response: string;
  sessionId: string;
  messageId: string;
  thinking?: string;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<Johnny5APIResponse<ChatSuccessResponse>>> {
  try {
    // 0. Check if J5 is enabled
    const j5Enabled = process.env.J5_ENABLED !== 'false';
    if (!j5Enabled) {
      console.log('[J5 Chat] J5 disabled via J5_ENABLED=false, returning error to trigger fallback');
      return NextResponse.json(
        {
          success: false,
          error: 'J5 is disabled. Please use /api/johnny5/chat instead.',
          code: 'J5_DISABLED',
          timestamp: new Date(),
        },
        { status: 503 }
      );
    }

    // 1. Parse and validate request
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    const { message, sessionKey = 'dashboard:main', history } = body;

    // Build message with recent in-session conversation context.
    // This ensures Johnny5 has explicit history even if ManusLive's internal
    // session state is truncated or reset.
    let messageWithContext = message;
    if (Array.isArray(history) && history.length > 0) {
      const recentTurns = history
        .filter(m => typeof m.role === 'string' && typeof m.content === 'string')
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'Johnny5'}: ${m.content.slice(0, 400)}`)
        .join('\n');
      if (recentTurns) {
        messageWithContext = `## Recent Conversation\n${recentTurns}\n\n---\n\nUser: ${message}`;
      }
    }

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required and must be a string',
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    if (message.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message cannot be empty',
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    if (message.length > 50000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message too long. Maximum 50,000 characters allowed.',
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    // 2. Get J5Bridge singleton
    const bridge = getJ5Bridge();

    // 3. Check connection status
    if (!bridge.isConnected()) {
      const status = bridge.getStatus();
      const config = bridge.getConfig();

      // Try to connect if not connected
      if (!status.connected) {
        console.log('[J5 Chat] Bridge not connected, attempting connection...');
        try {
          await bridge.connect(config.gatewayUrl);

          // CRITICAL FIX: Wait for authentication to complete
          // The connect() promise resolves when WebSocket opens, but auth is async
          // We need to wait up to 5 seconds for the authenticated event
          console.log('[J5 Chat] Waiting for authentication to complete...');

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Authentication timeout after 5 seconds'));
            }, 5000);

            // Check if already authenticated (race condition edge case)
            if (bridge.isConnected()) {
              clearTimeout(timeout);
              resolve();
              return;
            }

            // Wait for authenticated event
            const onAuth = () => {
              clearTimeout(timeout);
              bridge.off('authenticated', onAuth);
              resolve();
            };

            bridge.on('authenticated', onAuth);
          });

          console.log('[J5 Chat] Authentication complete, bridge ready');
        } catch (connectError) {
          console.error('[J5 Chat] Connection/auth failed:', connectError);
          return NextResponse.json(
            {
              success: false,
              error: connectError instanceof Error && connectError.message.includes('timeout')
                ? 'Connected to J5 but authentication timed out. Check J5_AUTH_TOKEN.'
                : `J5 gateway not available. Please ensure ManusLive is running at ${config.gatewayUrl}`,
              timestamp: new Date(),
            },
            { status: connectError instanceof Error && connectError.message.includes('timeout') ? 401 : 503 }
          );
        }
      }

      // Final check - should always pass now
      if (!bridge.isConnected()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Bridge connection check failed unexpectedly',
            timestamp: new Date(),
          },
          { status: 500 }
        );
      }
    }

    // 4. Send message via J5Bridge
    console.log(`[J5 Chat] Sending message to session ${sessionKey}: ${message.substring(0, 100)}...`);

    let response: J5Response;
    try {
      response = await bridge.sendMessage(sessionKey, messageWithContext);
    } catch (sendError) {
      console.error('[J5 Chat] Send error:', sendError);
      return NextResponse.json(
        {
          success: false,
          error: sendError instanceof Error ? sendError.message : 'Failed to send message to J5',
          timestamp: new Date(),
        },
        { status: 502 }
      );
    }

    console.log(`[J5 Chat] Response received: ${response.text.substring(0, 100)}...`);

    // 4.5 Detect CLI error text returned as "successful" response — trigger frontend fallback
    const cliErrorPatterns = [
      'Prompt is too long',
      'CLI exited with code',
      'Invalid API key',
      'API key not found',
      'Authentication failed',
      'ANTHROPIC_API_KEY',
    ];
    const hasCliError = cliErrorPatterns.some(pattern => response.text.includes(pattern));
    if (hasCliError) {
      console.warn('[J5 Chat] Response contains CLI error, triggering fallback:', response.text.slice(0, 200));
      return NextResponse.json(
        { success: false, error: 'J5 CLI error', code: 'J5_DISABLED', timestamp: new Date() },
        { status: 503 }
      );
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      data: {
        response: response.text,
        sessionId: response.sessionId,
        messageId: response.messageId,
        thinking: response.thinking,
        tokenUsage: response.tokenUsage,
      },
      timestamp: new Date(),
    });

  } catch (error) {
    console.error('[J5 Chat] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}
