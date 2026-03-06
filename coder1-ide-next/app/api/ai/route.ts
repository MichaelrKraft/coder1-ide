/**
 * /api/ai — Provider-aware AI endpoint.
 *
 * When multiAIPlatformsEnabled is true, dispatches to the selected provider
 * via the provider factory. When false, falls back to Claude Code directly.
 *
 * This replaces /api/claude as the primary AI endpoint. The old route
 * redirects here for backward compatibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionMemoryService } from '@/services/memory/session-memory-service';
import { features } from '@/lib/feature-flags';
import { MemoryMode } from '@/lib/memory-types';
import { handleError } from '@/lib/error-handler';
import { getProvider, getDefaultProvider } from '@/services/ai-platform/provider-factory';
import { trackTokenUsage } from '@/lib/token-attribution-service';
import { extractUserId } from '@/lib/auth/extract-user-id';

export const dynamic = 'force-dynamic';

const PROVIDER_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const ALLOWED_ORIGINS = [
  'https://coder1.app',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];

export async function POST(request: NextRequest) {
  try {
    // CORS check
    const origin = request.headers.get('origin');
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json({ error: 'Forbidden: Invalid origin' }, { status: 403 });
    }

    const body = await request.json();
    const { message, context, command, sessionId, includeMemory = true, platform, model } = body;
    const userId = extractUserId(request);

    // Select provider based on feature flag and request
    const featureFlags = features();
    const provider = featureFlags.multiAIPlatformsEnabled
      ? getProvider(platform)
      : getDefaultProvider();

    // Check provider availability
    if (!provider.isAvailable()) {
      return NextResponse.json(
        {
          error: `${provider.name} not available`,
          details: `Please install ${provider.name} CLI`,
          provider: provider.name,
          command: provider.getCommand()
        },
        { status: 503 }
      );
    }

    const session = sessionId || 'default';
    let enhancedMessage = message;
    let memoryContextUsed = '';

    // Inject memory context if enabled
    if (featureFlags.memoryContextEnabled && includeMemory) {
      const memoryMode = sessionMemoryService.getMemoryMode();

      if (memoryMode !== MemoryMode.OFF) {
        try {
          const memoryContext = await sessionMemoryService.getSmartContext(message || command);

          if (memoryContext && memoryContext.totalTokens > 0) {
            const formattedContext = sessionMemoryService.formatContextForInjection(memoryContext);
            if (formattedContext) {
              enhancedMessage = `${formattedContext}\n\n${message || command || ''}`;
              memoryContextUsed = formattedContext;
            }
          }
        } catch {
          // Continue without memory context
        }
      }
    }

    let response: string;

    if (command) {
      response = await withTimeout(
        provider.processTerminalCommand(session, enhancedMessage, context),
        PROVIDER_TIMEOUT_MS
      );

      // Track interaction
      if (featureFlags.memoryContextEnabled && sessionMemoryService.getMemoryMode() !== MemoryMode.OFF) {
        await sessionMemoryService.addInteraction({
          platform: provider.name,
          input: command,
          output: response,
          type: 'command'
        });
      }

      // Track token usage (estimate from text length: ~4 chars per token)
      try {
        const inputLen = (enhancedMessage || '').length;
        const outputLen = (response || '').length;
        trackTokenUsage({
          userId,
          provider: provider.name,
          model: model || 'default',
          inputTokens: Math.ceil(inputLen / 4),
          outputTokens: Math.ceil(outputLen / 4),
          sessionId: session,
        });
      } catch { /* don't fail the request if tracking fails */ }

      return NextResponse.json({
        content: response,
        provider: provider.name,
        memoryContextUsed: memoryContextUsed ? memoryContextUsed.length : 0
      });
    } else {
      // Create session if needed
      provider.createSession(session);

      response = await withTimeout(
        provider.sendMessage(session, enhancedMessage, context),
        PROVIDER_TIMEOUT_MS
      );

      // Track interaction
      if (featureFlags.memoryContextEnabled && sessionMemoryService.getMemoryMode() !== MemoryMode.OFF) {
        await sessionMemoryService.addInteraction({
          platform: provider.name,
          input: message,
          output: response,
          type: 'response'
        });
      }

      // Track token usage
      try {
        const inputLen = (enhancedMessage || '').length;
        const outputLen = (response || '').length;
        trackTokenUsage({
          userId,
          provider: provider.name,
          model: model || 'default',
          inputTokens: Math.ceil(inputLen / 4),
          outputTokens: Math.ceil(outputLen / 4),
          sessionId: session,
        });
      } catch { /* don't fail the request if tracking fails */ }

      return NextResponse.json({
        content: response,
        sessionId: session,
        provider: provider.name,
        memoryContextUsed: memoryContextUsed ? memoryContextUsed.length : 0
      });
    }

  } catch (error) {
    const appError = handleError(error, {
      endpoint: 'POST /api/ai',
      action: 'ai_interaction'
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

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[1];

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
