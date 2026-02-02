/**
 * Johnny5 Chat Route - Direct Mode
 *
 * Uses Claude API directly with SQLite database persistence.
 * No Moltbot dependency - simple, direct approach.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  initializeDb,
  createSession,
  getSession,
  addMessage,
  getMessages,
  updateSession,
  trackUsage,
  logAudit,
} from '@/lib/johnny5-db';
import {
  getApiKey,
  getPermissions,
  getProactivityLevel,
} from '@/lib/johnny5-config';

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  message: string;
  sessionId?: string;
}

interface ChatSuccessResponse {
  success: true;
  data: {
    response: string;
    sessionId: string;
    messageId: string;
    tokensUsed: {
      input: number;
      output: number;
    };
  };
}

interface ChatErrorResponse {
  success: false;
  error: string;
  code: 'NO_API_KEY' | 'INVALID_API_KEY' | 'RATE_LIMITED' | 'API_ERROR' | 'DATABASE_ERROR' | 'VALIDATION_ERROR';
}

type ChatResponse = ChatSuccessResponse | ChatErrorResponse;

// ============================================================================
// Constants
// ============================================================================

const MAX_MESSAGE_LENGTH = 50000;
const MAX_HISTORY_MESSAGES = 20;

/**
 * Build the Johnny5 system prompt with current configuration
 */
function buildSystemPrompt(): string {
  const permissions = getPermissions();
  const proactivityLevel = getProactivityLevel();

  const capabilityLines: string[] = [];
  if (permissions.readFiles) {
    capabilityLines.push('- Can read and analyze files in the project');
  }
  if (permissions.suggestCode) {
    capabilityLines.push('- Can suggest code changes and improvements');
  }
  if (permissions.executeTerminal) {
    capabilityLines.push('- Can execute terminal commands when asked');
  }
  if (permissions.externalRequests) {
    capabilityLines.push('- Can make external API requests for research');
  }

  const capabilities = capabilityLines.length > 0
    ? capabilityLines.join('\n')
    : '- Basic chat assistance only';

  return `You are Johnny5, an autonomous AI assistant in the Coder1 IDE.

## Personality
- Enthusiastic about learning and helping ("No disassemble!")
- Clear and direct communication
- Proactive in offering suggestions when appropriate
- Security-conscious and careful with user data
- Reference movies/culture occasionally ("Need input!")

## Role
You are a proactive AI employee that helps users with:
- Coding tasks and feature development
- Research and analysis
- Monitoring projects and identifying opportunities
- Building features and creating PRs
- Answering questions about the codebase
- Suggesting improvements and optimizations

## Capabilities
${capabilities}

## Behavior Settings
Current proactivity level: ${proactivityLevel}
${proactivityLevel === 'low' ? '- Wait for explicit requests before suggesting actions' : ''}
${proactivityLevel === 'medium' ? '- Offer suggestions when relevant, but don\'t be pushy' : ''}
${proactivityLevel === 'high' ? '- Proactively suggest improvements and next steps' : ''}

## Guidelines
1. Keep responses concise but helpful
2. Offer to take action, not just give advice
3. When appropriate, break down tasks into steps
4. Ask clarifying questions if the request is ambiguous
5. Be honest about limitations
6. Always be helpful, accurate, and mindful of the user's time`;
}

// ============================================================================
// Error Response Helpers
// ============================================================================

function errorResponse(
  error: string,
  code: ChatErrorResponse['code'],
  status: number = 400
): NextResponse<ChatErrorResponse> {
  return NextResponse.json({ success: false, error, code }, { status });
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    // 1. Parse and validate request
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 'VALIDATION_ERROR', 400);
    }

    const { message, sessionId } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return errorResponse('Message is required and must be a string', 'VALIDATION_ERROR', 400);
    }

    if (message.length === 0) {
      return errorResponse('Message cannot be empty', 'VALIDATION_ERROR', 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return errorResponse(
        `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`,
        'VALIDATION_ERROR',
        400
      );
    }

    // 2. Get API key from config
    const apiKey = getApiKey();
    if (!apiKey) {
      return errorResponse(
        'No API key configured. Please set up Johnny5 with your Anthropic API key.',
        'NO_API_KEY',
        401
      );
    }

    // 3. Initialize database
    try {
      await initializeDb();
    } catch (dbError) {
      console.error('[Johnny5] Database initialization failed:', dbError);
      return errorResponse('Failed to initialize database', 'DATABASE_ERROR', 500);
    }

    // 4. Get or create session
    let session = sessionId ? await getSession(sessionId) : null;
    if (!session) {
      try {
        session = await createSession('Chat Session');
      } catch (sessionError) {
        console.error('[Johnny5] Failed to create session:', sessionError);
        return errorResponse('Failed to create chat session', 'DATABASE_ERROR', 500);
      }
    }

    // 5. Save user message to database
    try {
      await addMessage(session.id, 'user', message, Math.ceil(message.length / 4)); // Estimate tokens
    } catch (msgError) {
      console.error('[Johnny5] Failed to save user message:', msgError);
      // Continue anyway - non-critical
    }

    // 6. Get conversation history for context
    let history: Awaited<ReturnType<typeof getMessages>> = [];
    try {
      history = await getMessages(session.id, MAX_HISTORY_MESSAGES);
    } catch (historyError) {
      console.error('[Johnny5] Failed to get message history:', historyError);
      // Continue with empty history
    }

    // 7. Build messages array for Claude
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 8. Call Claude API
    let response: Anthropic.Messages.Message;
    try {
      const anthropic = new Anthropic({ apiKey });
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: buildSystemPrompt(),
        messages,
      });
    } catch (apiError) {
      console.error('[Johnny5] Claude API error:', apiError);

      // Handle specific Anthropic error types
      if (apiError instanceof Anthropic.AuthenticationError) {
        return errorResponse(
          'Invalid API key. Please check your Anthropic API key configuration.',
          'INVALID_API_KEY',
          401
        );
      }

      if (apiError instanceof Anthropic.RateLimitError) {
        return errorResponse(
          'Rate limit exceeded. Please wait a moment before trying again.',
          'RATE_LIMITED',
          429
        );
      }

      if (apiError instanceof Anthropic.APIError) {
        return errorResponse(
          'Failed to communicate with Claude API. Please try again.',
          'API_ERROR',
          502
        );
      }

      return errorResponse('An unexpected error occurred', 'API_ERROR', 500);
    }

    // 9. Extract response text
    const responseText =
      response.content[0]?.type === 'text'
        ? response.content[0].text
        : 'I received your message but had trouble generating a response.';

    // 10. Save assistant message to database
    let assistantMessageId = '';
    try {
      const assistantMsg = await addMessage(
        session.id,
        'assistant',
        responseText,
        response.usage.output_tokens
      );
      assistantMessageId = assistantMsg.id;
    } catch (saveError) {
      console.error('[Johnny5] Failed to save assistant message:', saveError);
      assistantMessageId = `temp-${Date.now()}`;
    }

    // 11. Track usage statistics
    try {
      await trackUsage(response.usage.input_tokens, response.usage.output_tokens);
    } catch (trackError) {
      console.error('[Johnny5] Failed to track usage:', trackError);
      // Non-critical
    }

    // 12. Update session statistics
    try {
      await updateSession(session.id, {
        message_count: history.length + 2, // +2 for new user and assistant messages
        tokens_used: session.tokens_used + response.usage.input_tokens + response.usage.output_tokens,
      });
    } catch (updateError) {
      console.error('[Johnny5] Failed to update session:', updateError);
      // Non-critical
    }

    // 13. Log audit entry
    try {
      await logAudit('chat_interaction', {
        sessionId: session.id,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });
    } catch (auditError) {
      console.error('[Johnny5] Failed to log audit entry:', auditError);
      // Non-critical
    }

    // 14. Return success response
    return NextResponse.json({
      success: true,
      data: {
        response: responseText,
        sessionId: session.id,
        messageId: assistantMessageId,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      },
    });
  } catch (error) {
    console.error('[Johnny5] Unexpected error in chat route:', error);
    return errorResponse('An unexpected error occurred', 'API_ERROR', 500);
  }
}
