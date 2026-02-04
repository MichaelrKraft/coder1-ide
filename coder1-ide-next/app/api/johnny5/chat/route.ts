/**
 * Johnny5 Chat Route - Multi-Provider Support
 *
 * Priority order:
 * 1. Moltbot (Preferred) - Uses ManusLive daemon for 24/7 capabilities
 * 2. Bridge (Secondary) - Uses Claude Code CLI via Bridge connection
 * 3. Gemini (Fallback) - Uses Google Gemini 2.5 Flash (free tier)
 *
 * Moltbot mode connects to ManusLive for autonomous agent features.
 * Bridge mode requires running 'coder1-bridge start' locally.
 * Gemini mode uses your GEMINI_API_KEY automatically when neither is available.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeDb,
  createSession,
  getSession,
  addMessage,
  getMessages,
  updateSession,
  logAudit,
} from '@/lib/johnny5-db';
import {
  Johnny5BridgeService,
  ChatMessage,
} from '@/services/johnny5-bridge-service';
import {
  searchMemory,
  formatForPromptInjection,
  createGeminiProvider,
  // Memory Intelligence Services (NEW)
  buildMemoryContext,
  extractFactsFromConversation,
  saveFacts,
  getExistingFacts,
  runPatternDetectionCycle,
  type ConversationMessage as MemoryConversationMessage,
} from '@/services/memory';
import { getMoltbotBridge } from '@/services/johnny5/moltbot-bridge';

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  message: string;
  sessionId?: string;
  enableMemoryInjection?: boolean; // Toggle for memory injection
}

interface MemoryUsed {
  id: string;
  sourceType: string;
  score: number;
  citation: { file: string; startLine: number | null; endLine: number | null };
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
    memoryContext?: {
      enabled: boolean;
      memoriesUsed: MemoryUsed[];
      searchType: string;
      totalMemoryTokens: number;
    };
  };
}

interface ChatErrorResponse {
  success: false;
  error: string;
  code:
    | 'BRIDGE_NOT_CONNECTED'
    | 'BRIDGE_ERROR'
    | 'COMMAND_TIMEOUT'
    | 'DATABASE_ERROR'
    | 'VALIDATION_ERROR';
}

type ChatResponse = ChatSuccessResponse | ChatErrorResponse;

// ============================================================================
// Constants
// ============================================================================

const MAX_MESSAGE_LENGTH = 50000;
const MAX_HISTORY_MESSAGES = 20;

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

export async function POST(
  request: NextRequest
): Promise<NextResponse<ChatResponse>> {
  try {
    // 1. Parse and validate request
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        'Invalid JSON in request body',
        'VALIDATION_ERROR',
        400
      );
    }

    const { message, sessionId, enableMemoryInjection = true } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return errorResponse(
        'Message is required and must be a string',
        'VALIDATION_ERROR',
        400
      );
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

    // 2. Check Moltbot first (preferred), then Bridge, then GLM fallback
    const moltbotBridge = getMoltbotBridge();
    const moltbotStatus = moltbotBridge?.getStatus?.();
    const moltbotConnected = moltbotBridge?.isConnected() ?? false;

    console.log('[Johnny5] Moltbot check:', {
      hasBridge: !!moltbotBridge,
      isConnected: moltbotConnected,
      status: moltbotStatus ? {
        connected: moltbotStatus.connected,
        authenticated: moltbotStatus.authenticated,
        gatewayUrl: moltbotStatus.gatewayUrl,
      } : 'no status',
    });

    // If Moltbot is connected, use it with memory injection
    if (moltbotConnected) {
      console.log('[Johnny5] Moltbot connected - forwarding to Moltbot chat API');
      try {
        // Memory injection for Moltbot path
        let moltbotMessage = message;
        let moltbotMemoriesUsed: MemoryUsed[] = [];
        let moltbotSearchType = 'none';
        let moltbotMemoryTokens = 0;

        if (enableMemoryInjection) {
          try {
            const apiKey = process.env.GEMINI_API_KEY;
            const provider = apiKey ? createGeminiProvider({ apiKey }) : null;

            let queryEmbedding: number[] | undefined;
            if (provider) {
              try {
                const embeddings = await provider.embed([message]);
                if (embeddings.length > 0) {
                  queryEmbedding = embeddings[0];
                }
              } catch (embeddingError) {
                console.warn('[Johnny5/Moltbot] Memory embedding failed:', embeddingError);
              }
            }

            const searchResult = await searchMemory(message, queryEmbedding, {
              topK: 5,
              maxTokens: 2000,
              minScore: 0.05,  // Lower threshold for keyword-only search
            });

            console.log(`[Johnny5/Moltbot] Memory search: ${searchResult.results.length} results, type=${searchResult.searchType}, time=${searchResult.processingTimeMs}ms`);

            if (searchResult.results.length > 0) {
              const memoryContext = formatForPromptInjection(searchResult, 2000);
              moltbotMessage = `${memoryContext}\n\n---\n\n**User Query:**\n${message}`;
              moltbotSearchType = searchResult.searchType;
              moltbotMemoryTokens = searchResult.totalTokens;
              moltbotMemoriesUsed = searchResult.results.map((r) => ({
                id: r.chunk_id,
                sourceType: r.source_type,
                score: r.combined_score,
                citation: r.citation,
              }));
              console.log(`[Johnny5/Moltbot] Injected ${moltbotMemoriesUsed.length} memories: ${moltbotMemoriesUsed.map(m => m.sourceType).join(', ')}`);
            } else {
              console.log('[Johnny5/Moltbot] No memories found for query');
            }
          } catch (memoryError) {
            console.warn('[Johnny5/Moltbot] Memory search failed:', memoryError);
          }
        }

        const moltbotResponse = await moltbotBridge!.sendMessage(moltbotMessage, 'dashboard:main');
        return NextResponse.json({
          success: true,
          data: {
            response: moltbotResponse.text,
            sessionId: moltbotResponse.sessionId || 'moltbot',
            messageId: moltbotResponse.messageId || `msg-${Date.now()}`,
            tokensUsed: { input: 0, output: 0 },
            memoryContext: enableMemoryInjection
              ? {
                  enabled: true,
                  memoriesUsed: moltbotMemoriesUsed,
                  searchType: moltbotSearchType,
                  totalMemoryTokens: moltbotMemoryTokens,
                }
              : { enabled: false, memoriesUsed: [], searchType: 'none', totalMemoryTokens: 0 },
          },
        });
      } catch (moltbotError) {
        console.error('[Johnny5] Moltbot error, falling back:', moltbotError);
        // Fall through to Bridge/Gemini
      }
    }

    const johnny5Service = new Johnny5BridgeService('default');
    const bridgeConnected = johnny5Service.isBridgeConnected();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!bridgeConnected && !geminiApiKey) {
      return errorResponse(
        'Johnny5 not available. Either connect to ManusLive, run coder1-bridge start, or set GEMINI_API_KEY in .env.local.',
        'BRIDGE_NOT_CONNECTED',
        503
      );
    }

    // 3. Initialize database
    try {
      await initializeDb();
    } catch (dbError) {
      console.error('[Johnny5] Database initialization failed:', dbError);
      return errorResponse(
        'Failed to initialize database',
        'DATABASE_ERROR',
        500
      );
    }

    // 4. Get or create session
    let session = sessionId ? await getSession(sessionId) : null;
    if (!session) {
      try {
        session = await createSession('Chat Session');
      } catch (sessionError) {
        console.error('[Johnny5] Failed to create session:', sessionError);
        return errorResponse(
          'Failed to create chat session',
          'DATABASE_ERROR',
          500
        );
      }
    }

    // 5. Save user message to database
    const estimatedInputTokens = Math.ceil(message.length / 4);
    try {
      await addMessage(session.id, 'user', message, estimatedInputTokens);
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

    // 6.5. Memory injection - search for relevant context
    let memoryContext: string = '';
    let memoriesUsed: MemoryUsed[] = [];
    let searchType = 'none';
    let totalMemoryTokens = 0;

    if (enableMemoryInjection) {
      try {
        // Get embedding provider if available
        const apiKey = process.env.GEMINI_API_KEY;
        const provider = apiKey ? createGeminiProvider({ apiKey }) : null;

        // Generate query embedding for hybrid search
        let queryEmbedding: number[] | undefined;
        if (provider) {
          try {
            const embeddings = await provider.embed([message]);
            if (embeddings.length > 0) {
              queryEmbedding = embeddings[0];
            }
          } catch (embeddingError) {
            console.warn('[Johnny5] Memory embedding failed:', embeddingError);
          }
        }

        // Search memory for relevant context
        // Use lower minScore for keyword-only search (no vector search available)
        const searchResult = await searchMemory(message, queryEmbedding, {
          topK: 5,
          maxTokens: 2000,
          minScore: 0.05,  // Lower threshold for keyword-only search
        });

        console.log(`[Johnny5] Memory search completed: ${searchResult.results.length} results, type=${searchResult.searchType}, time=${searchResult.processingTimeMs}ms`);

        if (searchResult.results.length > 0) {
          // Format memories for injection
          memoryContext = formatForPromptInjection(searchResult, 2000);
          searchType = searchResult.searchType;
          totalMemoryTokens = searchResult.totalTokens;

          // Track which memories were used
          memoriesUsed = searchResult.results.map((r) => ({
            id: r.chunk_id,
            sourceType: r.source_type,
            score: r.combined_score,
            citation: r.citation,
          }));

          console.log(
            `[Johnny5] Injected ${memoriesUsed.length} memories (${searchType} search, ${totalMemoryTokens} tokens)`
          );
          console.log('[Johnny5] Memory sources:', memoriesUsed.map(m => `${m.sourceType}:${m.score.toFixed(2)}`).join(', '));
        } else {
          console.log('[Johnny5] No memories found for query');
        }
      } catch (memoryError) {
        console.warn('[Johnny5] Memory search failed:', memoryError);
        // Continue without memory injection
      }
    }

    // 6.6. Enhanced Memory Intelligence - facts and patterns (NEW)
    let factsAndPatternsContext = '';
    try {
      const intelligentMemory = await buildMemoryContext({
        userMessage: message,
        maxFacts: 8,
        maxPatterns: 4,
        minPatternConfidence: 0.7,
        includeManusLive: true,
      });

      if (intelligentMemory.combinedContext) {
        factsAndPatternsContext = intelligentMemory.combinedContext;
        console.log('[Johnny5] Memory intelligence:', {
          facts: intelligentMemory.sources.factsCount,
          patterns: intelligentMemory.sources.patternsCount,
          manusLive: intelligentMemory.sources.manusLiveAvailable,
        });
      }
    } catch (intelligenceError) {
      console.warn('[Johnny5] Memory intelligence failed:', intelligenceError);
      // Continue without enhanced memory
    }

    // 7. Build conversation history for Bridge service
    const conversationHistory: ChatMessage[] = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 8. Send prompt via Bridge or Gemini API
    // Inject memory context into the message if available
    // Combine document memory with facts/patterns for comprehensive context
    let enhancedMessage = message;
    const contextParts: string[] = [];

    // Add facts and patterns context (user knowledge)
    if (factsAndPatternsContext) {
      contextParts.push(factsAndPatternsContext);
    }

    // Add document/session memory context
    if (memoryContext) {
      contextParts.push(memoryContext);
    }

    if (contextParts.length > 0) {
      enhancedMessage = `${contextParts.join('\n\n')}\n\n---\n\n**User Query:**\n${message}`;
    }

    let result: { success: boolean; response: string; error?: string; errorCode?: string };
    let modeUsed: 'bridge' | 'gemini' = 'bridge';

    if (bridgeConnected) {
      // Primary: Use Bridge (Claude Code CLI)
      console.log('[Johnny5] Using Bridge mode');
      result = await johnny5Service.sendPrompt(enhancedMessage, conversationHistory);
    } else {
      // Fallback: Use Gemini API (Google Gemini 2.5 Flash - free tier)
      modeUsed = 'gemini';
      console.log('[Johnny5] Using Gemini API mode (Bridge not connected)');
      try {
        // Build conversation history in Gemini format
        const geminiContents = [
          // System instruction as first user message
          {
            role: 'user',
            parts: [{ text: 'You are Johnny5, a helpful AI assistant in the Coder1 IDE. You help with coding, debugging, and software development tasks. Be concise, helpful, and friendly. When you receive memory context, use it to provide more relevant responses. Please acknowledge this role.' }],
          },
          {
            role: 'model',
            parts: [{ text: 'Understood! I am Johnny5, ready to help with coding, debugging, and development tasks in Coder1 IDE.' }],
          },
          // Add conversation history
          ...conversationHistory.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          // Add current message
          {
            role: 'user',
            parts: [{ text: enhancedMessage }],
          },
        ];

        const apiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: geminiContents,
            }),
          }
        );

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error('[Johnny5] Gemini API error:', apiResponse.status, errorText);
          result = {
            success: false,
            response: '',
            error: `Gemini API error: ${apiResponse.status} - ${errorText}`,
            errorCode: 'BRIDGE_ERROR',
          };
        } else {
          const data = await apiResponse.json();
          // Gemini response format
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          result = {
            success: true,
            response: responseText,
          };
        }
      } catch (apiError) {
        console.error('[Johnny5] Gemini API call failed:', apiError);
        result = {
          success: false,
          response: '',
          error: apiError instanceof Error ? apiError.message : 'Gemini API call failed',
          errorCode: 'BRIDGE_ERROR',
        };
      }

      // Direct Claude CLI fallback - uses your Pro/Max subscription!
      if (!result.success) {
        console.log('[Johnny5] Gemini failed, trying direct Claude CLI (uses your subscription)');
        try {
          const { execSync, spawnSync } = await import('child_process');
          const fs = await import('fs');
          const os = await import('os');
          const path = await import('path');

          // Check if claude CLI is available
          try {
            execSync('which claude', { encoding: 'utf-8', stdio: 'pipe' });
          } catch {
            throw new Error('Claude CLI not installed on server');
          }

          // Build a simple prompt with context embedded
          let fullPrompt = '[SYSTEM] You are Johnny5, a helpful AI assistant. Be concise and helpful. Use any memory context provided to give relevant responses.\n\n';

          // Add memory context if available
          fullPrompt += enhancedMessage;

          try {
            // Call claude CLI with simple --print flag only
            // IMPORTANT: Pass CLAUDE_CODE_OAUTH_TOKEN for subprocess authentication
            const homeDir = process.env.HOME || '/Users/michaelkraft';
            const cliEnv = {
              ...process.env,
              HOME: homeDir,
              USER: process.env.USER || 'michaelkraft',
              SHELL: '/bin/zsh',
              TMPDIR: process.env.TMPDIR || '/tmp',
              // Pass OAuth token for subprocess authentication (uses your Pro/Max subscription!)
              CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
            };
            delete cliEnv.ANTHROPIC_API_KEY; // Remove so CLI uses OAuth instead
            delete cliEnv.NEXT_PUBLIC_ANTHROPIC_API_KEY;

            console.log('[Johnny5] CLI attempting with input piped, HOME:', cliEnv.HOME);

            // Use stdin to pass the prompt - avoids shell escaping issues
            const cliResult = spawnSync('claude', ['--print'], {
              input: fullPrompt,
              encoding: 'utf-8',
              timeout: 90000, // 90 second timeout
              maxBuffer: 10 * 1024 * 1024, // 10MB buffer
              env: cliEnv,
              cwd: homeDir,
            });

            if (cliResult.error) {
              throw cliResult.error;
            }

            if (cliResult.status !== 0) {
              const errorMsg = cliResult.stderr || cliResult.stdout || 'Unknown error';
              throw new Error(`CLI exited with code ${cliResult.status}: ${errorMsg}`);
            }

            const cliResponse = cliResult.stdout;
            if (cliResponse && cliResponse.trim()) {
              result = {
                success: true,
                response: cliResponse.trim(),
              };
              modeUsed = 'bridge'; // Track as bridge since it uses subscription
              console.log('[Johnny5] Direct CLI successful (using your Pro/Max subscription)');
            } else {
              throw new Error('Empty response from Claude CLI');
            }
          } catch (innerErr) {
            throw innerErr;
          }
        } catch (cliError) {
          console.warn('[Johnny5] Direct CLI failed:', cliError instanceof Error ? cliError.message : cliError);
          // Continue to Anthropic API fallback if configured
        }
      }

      // Anthropic API fallback (pay-per-use) - only if CLI also failed
      if (!result.success && process.env.ANTHROPIC_API_KEY) {
        console.log('[Johnny5] CLI failed, falling back to Anthropic API (pay-per-use)');
        try {
          const oauthResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4000,
              system: 'You are Johnny5, a helpful AI assistant in the Coder1 IDE. You help with coding, debugging, and software development tasks. Be concise, helpful, and friendly. When you receive memory context, use it to provide more relevant responses.',
              messages: [
                ...conversationHistory.map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
                { role: 'user', content: enhancedMessage },
              ],
            }),
          });

          if (!oauthResponse.ok) {
            const errorText = await oauthResponse.text();
            console.error('[Johnny5] OAuth API error:', oauthResponse.status, errorText);
            result = {
              success: false,
              response: '',
              error: `OAuth API error: ${oauthResponse.status} - ${errorText}`,
              errorCode: 'BRIDGE_ERROR',
            };
          } else {
            const data = await oauthResponse.json();
            const responseText = data.content?.[0]?.text || '';
            result = {
              success: true,
              response: responseText,
            };
            modeUsed = 'gemini'; // Still track as gemini since it's not bridge
            console.log('[Johnny5] OAuth fallback successful');
          }
        } catch (oauthError) {
          console.error('[Johnny5] OAuth fallback failed:', oauthError);
          result = {
            success: false,
            response: '',
            error: oauthError instanceof Error ? oauthError.message : 'OAuth API call failed',
            errorCode: 'BRIDGE_ERROR',
          };
        }
      }
    }

    if (!result.success) {
      console.error('[Johnny5] Error:', result.error);

      // Map error codes to appropriate responses
      if (result.errorCode === 'BRIDGE_NOT_CONNECTED') {
        return errorResponse(
          'Bridge disconnected. Please ensure coder1-bridge is running.',
          'BRIDGE_NOT_CONNECTED',
          503
        );
      }

      if (result.errorCode === 'COMMAND_TIMEOUT') {
        return errorResponse(
          'Request timed out. Please try again with a simpler request.',
          'COMMAND_TIMEOUT',
          504
        );
      }

      return errorResponse(
        result.error || 'Failed to get response from Claude',
        'BRIDGE_ERROR',
        502
      );
    }

    const responseText = result.response;

    // 9. Estimate output tokens (CLI doesn't provide exact counts)
    const estimatedOutputTokens = Math.ceil(responseText.length / 4);

    // 10. Save assistant message to database
    let assistantMessageId = '';
    try {
      const assistantMsg = await addMessage(
        session.id,
        'assistant',
        responseText,
        estimatedOutputTokens
      );
      assistantMessageId = assistantMsg.id;
    } catch (saveError) {
      console.error('[Johnny5] Failed to save assistant message:', saveError);
      assistantMessageId = `temp-${Date.now()}`;
    }

    // 11. Update session statistics
    try {
      await updateSession(session.id, {
        message_count: history.length + 2, // +2 for new user and assistant messages
        tokens_used:
          session.tokens_used + estimatedInputTokens + estimatedOutputTokens,
      });
    } catch (updateError) {
      console.error('[Johnny5] Failed to update session:', updateError);
      // Non-critical
    }

    // 12. Log audit entry
    try {
      await logAudit('chat_interaction', {
        sessionId: session.id,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        mode: modeUsed, // Track which mode was used (bridge or glm)
        memoryInjection: {
          enabled: enableMemoryInjection,
          memoriesUsed: memoriesUsed.length,
          searchType,
          totalTokens: totalMemoryTokens,
        },
      });
    } catch (auditError) {
      console.error('[Johnny5] Failed to log audit entry:', auditError);
      // Non-critical
    }

    // 12.5. After-Chat Memory Intelligence (NEW)
    // Run fact extraction asynchronously - don't block the response
    // This enables Johnny5 to learn from every conversation
    setImmediate(async () => {
      try {
        // Build conversation history for extraction
        const fullHistory: MemoryConversationMessage[] = [
          ...history.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: responseText },
        ];

        // Get existing facts to avoid duplicates
        const existingFacts = await getExistingFacts(session.id, 30);

        // Extract new facts from this conversation
        const newFacts = await extractFactsFromConversation(fullHistory, existingFacts);

        if (newFacts.length > 0) {
          await saveFacts(session.id, newFacts);
          console.log(`[Johnny5] After-chat extraction: saved ${newFacts.length} new facts`);
        }

        // Run pattern detection every 10 conversations (approximately)
        // Check if this is roughly a 10th conversation
        const messageCount = history.length + 2;
        if (messageCount > 0 && messageCount % 20 === 0) {
          console.log('[Johnny5] Running pattern detection cycle...');
          const patternResult = await runPatternDetectionCycle();
          console.log('[Johnny5] Pattern cycle:', patternResult);
        }
      } catch (extractionError) {
        console.error('[Johnny5] After-chat extraction error:', extractionError);
        // Non-blocking - don't affect the response
      }
    });

    // 13. Return success response
    return NextResponse.json({
      success: true,
      data: {
        response: responseText,
        sessionId: session.id,
        messageId: assistantMessageId,
        tokensUsed: {
          input: estimatedInputTokens,
          output: estimatedOutputTokens,
        },
        memoryContext: enableMemoryInjection
          ? {
              enabled: true,
              memoriesUsed,
              searchType,
              totalMemoryTokens,
            }
          : { enabled: false, memoriesUsed: [], searchType: 'none', totalMemoryTokens: 0 },
      },
    });
  } catch (error) {
    console.error('[Johnny5] Unexpected error in chat route:', error);
    return errorResponse('An unexpected error occurred', 'BRIDGE_ERROR', 500);
  }
}
