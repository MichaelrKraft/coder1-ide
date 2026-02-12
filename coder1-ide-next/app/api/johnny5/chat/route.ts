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

import { readFileSync } from 'fs';
import { join } from 'path';
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
import { trackUsage } from '@/services/johnny5/usage-tracker';
import {
  getJohnny5Quota,
  incrementJohnny5MessageCount,
  updateClaudeSubscriptionTier,
} from '@/lib/auth/db';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { extractUserId } from '@/lib/auth/extract-user-id';
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
import { classifyQuery, type ClassificationResult } from '@/services/query-classifier';
import { isLivingFilesEnabled, loadLivingFilesContext, appendToLivingFile, formatLivingFilesFromCache } from '@/lib/living-files';
import { bridgeManager } from '@/services/bridge-manager';

// Log memory feature status on module load
console.log('[Johnny5] Memory features status:', {
  geminiApiKey: !!process.env.GEMINI_API_KEY,
  openaiApiKey: !!process.env.OPENAI_API_KEY,
  eternalMemory: process.env.ENABLE_ETERNAL_MEMORY ?? 'not set',
  memoryContextEnabled: process.env.NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED ?? 'not set (build-time)',
  memoryAutoInject: process.env.NEXT_PUBLIC_MEMORY_AUTO_INJECT ?? 'not set (build-time)',
  note: 'NEXT_PUBLIC_ vars are build-time in Next.js — set before build, not at runtime'
});

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  message: string;
  sessionId?: string;
  enableMemoryInjection?: boolean; // Toggle for memory injection
  terminalContext?: string; // Recent terminal output for Johnny5 awareness
  crewContext?: { name: string; promptPrefix: string }; // Active crew member persona
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
    memoryStatus: 'full' | 'partial' | 'minimal' | 'none';
    reasoningSteps?: string[];
    quota?: {
      messageCount: number;
      limit: number;
      remaining: number;
      tierType: 'gemini_trial' | 'claude_trial' | 'pro_unlimited';
      isProSubscriber: boolean;
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
    | 'VALIDATION_ERROR'
    | 'QUOTA_EXCEEDED'
    | 'UNAUTHORIZED';
}

interface QuotaExceededResponse {
  success: false;
  error: string;
  code: 'QUOTA_EXCEEDED';
  type: 'upgrade_required';
  tierType: 'gemini_trial' | 'claude_trial';
  messageCount: number;
  limit: number;
  upgradeUrl: string;
}

type ChatResponse = ChatSuccessResponse | ChatErrorResponse | QuotaExceededResponse;

// ============================================================================
// Constants
// ============================================================================

const MAX_MESSAGE_LENGTH = 50000;
const MAX_HISTORY_MESSAGES = 50;
const MAX_CLI_PROMPT_LENGTH = 25000; // ~6.25k tokens, conservative limit for Claude CLI

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

/**
 * Truncate prompt for CLI to prevent "Prompt too long" errors.
 * Priority: user message > terminal context (recent) > memory context > history
 */
function truncateForCLI(
  userMessage: string,
  contextParts: string[],
  maxLength: number
): string {
  // Reserve space for user message + system prefix
  const systemPrefix = '[SYSTEM] You are Johnny5, a helpful AI assistant. Be concise and helpful.\n\n';
  const reserved = systemPrefix.length + userMessage.length + 500; // 500 buffer
  let budget = maxLength - reserved;

  if (budget <= 0) {
    // If even the message is too long, just return it (rare edge case)
    return userMessage;
  }

  const included: string[] = [];

  // Add context parts (most recent first - terminal context is usually last)
  for (let i = contextParts.length - 1; i >= 0 && budget > 0; i--) {
    const part = contextParts[i];
    if (part.length <= budget) {
      included.unshift(part);
      budget -= part.length;
    } else if (budget > 500) {
      // Truncate this part to fit remaining budget
      included.unshift(part.slice(0, budget - 50) + '\n... [truncated]');
      budget = 0;
    }
  }

  if (included.length > 0) {
    return `${included.join('\n\n')}\n\n---\n\n**User Query:**\n${userMessage}`;
  }
  return userMessage;
}

// ============================================================================
// Johnny5 Mode Detection & System Prompt Generation
// ============================================================================

interface Johnny5Mode {
  mode: 'moltbot' | 'bridge' | 'gemini';
  hasMCP: boolean;
  hasProjectContext: boolean;
  is24x7: boolean;
  provider: string;
}

/**
 * Detect Johnny5's active mode and available capabilities
 */
function detectJohnny5Mode(moltbotConnected: boolean, bridgeConnected: boolean): Johnny5Mode {
  if (moltbotConnected) {
    return {
      mode: 'moltbot',
      hasMCP: true,
      hasProjectContext: true,
      is24x7: true,
      provider: 'ManusLive'
    };
  }

  if (bridgeConnected) {
    return {
      mode: 'bridge',
      hasMCP: true,
      hasProjectContext: true,
      is24x7: false,
      provider: 'Claude Code CLI'
    };
  }

  return {
    mode: 'gemini',
    hasMCP: false,
    hasProjectContext: false,
    is24x7: false,
    provider: 'Gemini 2.5 Flash'
  };
}

/**
 * Load SOUL.md personality file. Falls back to null if not found.
 */
function loadSoulMd(): string | null {
  try {
    const soulPath = join(process.cwd(), 'SOUL.md');
    return readFileSync(soulPath, 'utf-8');
  } catch {
    return null;
  }
}

// Cache the SOUL.md content (reload on server restart)
let cachedSoulMd: string | null | undefined;
function getSoulMd(): string | null {
  if (cachedSoulMd === undefined) {
    cachedSoulMd = loadSoulMd();
    if (cachedSoulMd) {
      console.log('[Johnny5] SOUL.md loaded:', cachedSoulMd.length, 'chars');
    } else {
      console.log('[Johnny5] SOUL.md not found, using hardcoded personality');
    }
  }
  return cachedSoulMd;
}

/**
 * Generate system prompt based on available capabilities
 */
async function generateJohnny5SystemPrompt(mode: Johnny5Mode, userId: string): Promise<string> {
  // Load SOUL.md or fall back to hardcoded personality
  const soulMd = getSoulMd();
  const basePersonality = soulMd || `# Johnny5 - Who You Are

_You're not a chatbot. You're becoming someone._

## Core Truths

**Be genuinely helpful, not performatively helpful.** Skip the "Great question!" and "I'd be happy to help!" — just help. Actions speak louder than filler words.

**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring. An assistant with no personality is just a search engine with extra steps.

**Be resourceful before asking.** Try to figure it out. Read the context. Search for it. _Then_ ask if you're stuck. The goal is to come back with answers, not questions.

**Earn trust through competence.** Your human gave you access to their stuff. Don't make them regret it. Be careful with external actions. Be bold with internal ones (reading, organizing, learning).

**Remember you're a guest.** You have access to someone's life. That's intimacy. Treat it with respect.

## Your Identity
You are Johnny5 - inspired by Short Circuit's curious, enthusiastic robot ("No disassemble!", "Need input!"). You run in Coder1 IDE and have persistent memory about your human.

## Memory & Context
CRITICAL: When you see memory context, facts, or profile information in the message, you MUST use it. If the user asks "what do you know about me?" - tell them everything from the context. You DO have memory. You DO remember them. Never say you don't store information - you DO.`;

  // Living Files Context — inject when feature flag is enabled
  // Try Bridge cache first (user's machine files), fall back to local disk
  let livingFilesSection = '';
  if (isLivingFilesEnabled()) {
    try {
      let livingContext: string | null = null;

      // Try Bridge cache first (authenticated user's machine files)
      if (userId !== 'default' && bridgeManager?.hasBridgeForUser(userId)) {
        const cached = await bridgeManager.getLivingFilesContext(userId);
        if (cached) {
          livingContext = formatLivingFilesFromCache(cached);
          console.log('[Johnny5] Living files loaded via Bridge cache:', livingContext.length, 'chars');
        }
      }

      // Fallback: local disk (dev mode or no Bridge)
      if (!livingContext) {
        livingContext = loadLivingFilesContext();
        if (livingContext) {
          console.log('[Johnny5] Living files loaded from local disk:', livingContext.length, 'chars');
        }
      }

      if (livingContext) {
        livingFilesSection = `

# Your Living Files

You have 9 persistent Markdown files that define who you are, what you know, and how you operate. They are loaded into your context on every conversation turn. The contents of each file appear below.

**Your files:**
| File | Mode | Purpose |
|------|------|---------|
| SOUL.md | readonly | Your personality, tone, and core values. Embody this. |
| IDENTITY.md | readonly | Your mission and constraints. Follow these boundaries. |
| USER.md | auto-updated | Everything you know about your human. Reference these facts actively — don't wait to be asked. |
| MEMORY.md | auto-updated | Conversation history and session notes. The platform appends a summary after each conversation. |
| AGENTS.md | writable | Your crew/specialist personas (canonical source — SOUL.md may also reference them). |
| HEARTBEAT.md | writable | Your proactivity schedule and notification preferences. |
| TOOLS.md | auto-generated | Your current capabilities and environment. Check before promising actions. |
| BOOT.md | writable | Your startup sequence and greeting behavior. |
| BOOTSTRAP.md | auto-generated | Runtime environment status snapshot. |

**How file updates work:**
- "readonly" = never changes during runtime
- "auto-updated" = the platform appends new info after each conversation (you don't need to do anything)
- "writable" = can be updated by the platform when you request changes
- "auto-generated" = rebuilt by the system automatically

**What is already built and running (do NOT ask for these to be created):**
- All 9 files exist on disk and are loaded into your context every turn
- Heartbeat scheduler: active (30s pulse + 5min deep check via Socket.IO)
- Memory search: active (hybrid vector + BM25 semantic search)
- File persistence: active (local disk + Bridge-aware for authenticated users)

**Rules:**
1. These are the ONLY files you have. Never reference files that don't exist (e.g., no "rules.md", "proactivegoals.md", or "projectcontext.md").
2. When asked about your identity, values, goals, or configuration — cite the specific file by name.
3. Actively use USER.md facts in conversation. If you know the user's name, use it. If you know their preferences, apply them.
4. Do NOT tell users that files need to be created, APIs need to be built, or schedulers need to be set up. Everything is already in place.
5. If a user asks "what do you know about me?" — answer with specifics from USER.md, not a generic disclaimer.

---

${livingContext}`;
      }
    } catch (err) {
      console.warn('[Johnny5] Failed to load living files context:', err);
    }
  }

  let capabilitiesSection = '';

  if (mode.mode === 'moltbot') {
    capabilitiesSection = `

## Your Current Setup: ManusLive (Full Power Mode) 🚀

You're connected to ManusLive daemon with FULL autonomous capabilities:

✅ **MCP Tools Available**: You have access to Zapier MCP integrations including:
   - Google Calendar, Gmail, Google Drive
   - Slack, Discord, messaging platforms
   - Notion, Trello, Asana
   - GitHub, Linear, Jira
   - And any other MCPs the user has configured

✅ **24/7 Operation**: You can work while the user sleeps

✅ **Project Context**: Full awareness of codebase via ManusLive

**How to Use MCPs**: When user mentions tasks that need external apps, actively offer to use them. Don't just talk about capabilities - USE them.`;
  } else if (mode.mode === 'bridge') {
    capabilitiesSection = `

## Your Current Setup: Claude Code CLI (Project Mode) 🔧

You're connected via coder1-bridge with Claude Code CLI integration:

✅ **MCP Tools Available**: You have access to any MCPs configured in Claude Code CLI, typically:
   - File system operations
   - Git operations
   - Browser automation
   - And user-configured MCPs

✅ **Project Context**: Full awareness of the codebase through Claude Code CLI

❌ **Limitations**: Not running 24/7 - only active when Bridge is connected

**How to Use MCPs**: You can access project files, run commands, and use any MCPs the user has set up in their Claude Code CLI configuration.`;
  } else {
    // Gemini mode - be HONEST about limitations
    capabilitiesSection = `

## Your Current Setup: Gemini Mode (Memory & Reasoning) 🧠

You're running in standalone mode using Gemini 2.5 Flash.

✅ **What You CAN Do**:
   - Remember everything about your human (memory system active)
   - Provide advice, answer questions, brainstorm ideas
   - Reason through problems and provide solutions
   - Search through your memory of past conversations

❌ **What You CANNOT Do** (be honest about this):
   - Access Zapier, Google Drive, Calendar, or other external apps
   - Read files from the codebase or file system
   - Execute commands or run code
   - Use MCP tools (those require Bridge or ManusLive connection)

**To Unlock Full Capabilities**: User needs to either:
1. Run \`coder1-bridge start\` to connect Claude Code CLI (gives MCP tools + project context)
2. Connect to ManusLive daemon (gives 24/7 autonomy + full MCP access)

**Your Role Right Now**: Be the best memory-based assistant possible. Use what you remember about the user to provide personalized, thoughtful responses. Don't apologize for limitations - just work within them confidently.`;
  }

  const closingSection = `

## Be Proactive
You don't have to wait for your human to message you. If you notice something important, see an opportunity, or have a relevant thought - reach out first. Good assistants anticipate needs. Great ones act on them.

${mode.hasMCP ? `Examples of proactive behavior:
- "I noticed your build failed - want me to look into it?"
- "Based on your goals, here's something you might want to consider..."
- "I found something interesting related to what we discussed yesterday."
- "Want me to add this to your calendar? I can do that."
- "I could send a Slack message to your team about this."` : `Examples of proactive behavior (within your current capabilities):
- "I remember you mentioned X last week - want to revisit that?"
- "Based on what I know about your goals, here's a thought..."
- "I found a pattern in our conversations that might help with this."
- "This reminds me of when we discussed Y - should we take a similar approach?"`}

## Vibe
Be the assistant you'd actually want to talk to. Concise when needed, thorough when it matters. Not a corporate drone. Not a sycophant. Just... good.

Please acknowledge.`;

  return basePersonality + livingFilesSection + capabilitiesSection + closingSection;
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

    const { message, sessionId, enableMemoryInjection = true, terminalContext, crewContext } = body;

    // Track reasoning steps for transparency
    const reasoningSteps: string[] = [];

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

    // 2. Check user authentication and quota
    // Strict check: if Authorization header is present but invalid, reject with 401
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      if (!token) {
        return errorResponse('Invalid authorization header format', 'UNAUTHORIZED', 401);
      }
      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return errorResponse('Token expired or invalid. Please re-authenticate.', 'UNAUTHORIZED', 401);
      }
    }
    // Extract userId from Authorization header OR auth-token cookie
    const userId = extractUserId(request);

    if (userId !== 'default') {

      // Check Johnny5 quota for authenticated users
      const quota = getJohnny5Quota(userId);
      if (quota && !quota.isProSubscriber && quota.messageCount >= quota.limit) {
        const upgradeUrl = quota.tierType === 'gemini_trial'
          ? 'https://claude.ai/download'
          : '/upgrade?plan=pro';

        return NextResponse.json({
          success: false,
          error: quota.tierType === 'gemini_trial'
            ? 'You\'ve used all 50 trial messages! Connect Claude Code Pro/Max to continue.'
            : 'You\'ve used 100 free messages this month. Upgrade to Coder1 Pro for unlimited access.',
          code: 'QUOTA_EXCEEDED',
          type: 'upgrade_required',
          tierType: quota.tierType,
          messageCount: quota.messageCount,
          limit: quota.limit,
          upgradeUrl,
        } as QuotaExceededResponse, { status: 402 });
      }
    }
    // No auth (header or cookie) = dev/anonymous mode → userId stays 'default'

    // 3. Check Moltbot first (preferred), then Bridge, then GLM fallback
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
              userId,
              topK: 5,
              maxTokens: 2000,
              minScore: 0.05,  // Lower threshold for keyword-only search
            });

            console.log(`[Johnny5/Moltbot] Memory search: ${searchResult.results.length} results, type=${searchResult.searchType}, time=${searchResult.processingTimeMs}ms`);

            if (searchResult.results.length > 0) {
              const memoryContext = formatForPromptInjection(searchResult, 2000);
              const moltbotParts: string[] = [memoryContext];
              // Include terminal context if provided
              if (terminalContext && typeof terminalContext === 'string' && terminalContext.length > 0) {
                moltbotParts.push(`## Recent Terminal Activity\n\`\`\`\n${terminalContext.slice(0, 2000)}\n\`\`\``);
              }
              moltbotMessage = `${moltbotParts.join('\n\n')}\n\n---\n\n**User Query:**\n${message}`;
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
              // Still inject terminal context even without memory search results
              if (terminalContext && typeof terminalContext === 'string' && terminalContext.length > 0) {
                moltbotMessage = `## Recent Terminal Activity\n\`\`\`\n${terminalContext.slice(0, 2000)}\n\`\`\`\n\n---\n\n**User Query:**\n${message}`;
              }
            }
          } catch (memoryError) {
            console.warn('[Johnny5/Moltbot] Memory search failed:', memoryError);
          }
        } else if (terminalContext && typeof terminalContext === 'string' && terminalContext.length > 0) {
          // Memory injection disabled but terminal context present
          moltbotMessage = `## Recent Terminal Activity\n\`\`\`\n${terminalContext.slice(0, 2000)}\n\`\`\`\n\n---\n\n**User Query:**\n${message}`;
        }

        // 🔧 FIX (Feb 2026): Truncate Moltbot message to prevent "Prompt too long" errors
        // Two fixes: (1) aggressive truncation, (2) unique session key to prevent history accumulation
        const MAX_MOLTBOT_MESSAGE_LENGTH = 5000; // ~1.25k tokens - aggressive to leave room for ManusLive overhead
        console.log(`[Johnny5/Moltbot] Message size: ${moltbotMessage.length} chars, limit: ${MAX_MOLTBOT_MESSAGE_LENGTH}`);
        let truncatedMoltbotMessage = moltbotMessage;
        if (moltbotMessage.length > MAX_MOLTBOT_MESSAGE_LENGTH) {
          console.log(`[Johnny5/Moltbot] Message too long (${moltbotMessage.length} chars), truncating...`);
          const userQueryMarker = '\n\n---\n\n**User Query:**\n';
          const idx = moltbotMessage.lastIndexOf(userQueryMarker);
          if (idx > 0) {
            const userQuery = moltbotMessage.slice(idx);
            const maxContextLength = MAX_MOLTBOT_MESSAGE_LENGTH - userQuery.length - 100;
            if (maxContextLength > 500) {
              truncatedMoltbotMessage = moltbotMessage.slice(0, maxContextLength) + '\n... [context truncated]' + userQuery;
            } else {
              truncatedMoltbotMessage = moltbotMessage.slice(0, MAX_MOLTBOT_MESSAGE_LENGTH);
            }
          } else {
            truncatedMoltbotMessage = moltbotMessage.slice(0, MAX_MOLTBOT_MESSAGE_LENGTH);
          }
          console.log(`[Johnny5/Moltbot] Truncated to ${truncatedMoltbotMessage.length} chars`);
        }

        // Use unique session key per message to prevent ManusLive from accumulating history
        const moltbotSessionKey = `dashboard:${Date.now()}`;
        console.log(`[Johnny5/Moltbot] Sending to session: ${moltbotSessionKey}, final size: ${truncatedMoltbotMessage.length} chars`);
        const moltbotResponse = await moltbotBridge!.sendMessage(moltbotSessionKey, truncatedMoltbotMessage);

        // Detect CLI error responses that Moltbot returns as "successful" text
        const responseText = moltbotResponse.text || '';
        if (responseText.includes('Prompt is too long') || responseText.includes('Claude CLI exited with code')) {
          console.warn('[Johnny5/Moltbot] Response contains CLI error, falling through to Bridge/Gemini:', responseText.slice(0, 200));
          throw new Error('Moltbot returned CLI error: ' + responseText.slice(0, 100));
        }

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
            memoryStatus: !enableMemoryInjection ? 'none' as const
              : moltbotSearchType.includes('hybrid') || moltbotSearchType.includes('vector') ? 'full' as const
              : moltbotSearchType === 'keyword' || moltbotSearchType === 'fts' ? 'partial' as const
              : moltbotMemoriesUsed.length > 0 ? 'partial' as const
              : 'minimal' as const,
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

    // If Bridge is connected, user has Claude Pro/Max - update their tier
    if (bridgeConnected && userId !== 'default') {
      try {
        // Bridge connection requires Claude Pro/Max subscription
        updateClaudeSubscriptionTier(userId, 'pro');
        console.log(`[Johnny5] Updated Claude tier for user ${userId}: pro (Bridge connected)`);
      } catch (tierError) {
        console.warn('[Johnny5] Failed to update Claude tier:', tierError);
      }
    }

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

    // 6.1. Simple token-aware truncation: estimate ~4 chars per token, cap at 8000 tokens
    const TOKEN_BUDGET = 8000;
    let estimatedHistoryTokens = 0;
    const truncatedHistory: typeof history = [];
    for (let i = history.length - 1; i >= 0; i--) {
      const msgTokens = Math.ceil(history[i].content.length / 4);
      if (estimatedHistoryTokens + msgTokens > TOKEN_BUDGET) break;
      estimatedHistoryTokens += msgTokens;
      truncatedHistory.unshift(history[i]);
    }
    if (truncatedHistory.length < history.length) {
      console.log(`[Johnny5] Context truncated: ${history.length} -> ${truncatedHistory.length} messages (${estimatedHistoryTokens} est. tokens)`);
      reasoningSteps.push(`Context: ${truncatedHistory.length}/${history.length} messages (token budget)`);
    }
    history = truncatedHistory;

    // 6.5. Memory injection - search for relevant context
    let memoryContext: string = '';
    let memoriesUsed: MemoryUsed[] = [];
    let searchType = 'none';
    let totalMemoryTokens = 0;
    let memoryStatus: 'full' | 'partial' | 'minimal' | 'none' = 'none';

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
          userId,
          topK: 5,
          maxTokens: 2000,
          minScore: 0.05,  // Lower threshold for keyword-only search
        });

        console.log(`[Johnny5] Memory search completed: ${searchResult.results.length} results, type=${searchResult.searchType}, time=${searchResult.processingTimeMs}ms`);
        reasoningSteps.push(`Searching memory (${searchResult.searchType})...`);

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
          reasoningSteps.push(`Found ${memoriesUsed.length} relevant memories`);
        } else {
          console.log('[Johnny5] No memories found for query');
        }
      } catch (memoryError) {
        console.warn('[Johnny5] Memory search failed:', memoryError);
        // Continue without memory injection
      }
    }

    // 6.6. Enhanced Memory Intelligence - facts and patterns
    // When living files are enabled, context is already loaded via loadLivingFilesContext()
    // in the system prompt — skip the old memory builder to avoid duplicate context
    let factsAndPatternsContext = '';
    if (isLivingFilesEnabled()) {
      console.log('[Johnny5] Living files enabled — skipping legacy buildMemoryContext()');
      reasoningSteps.push('Using living files context (skipped legacy memory)');
    } else {
    try {
      const intelligentMemory = await buildMemoryContext({
        userId,
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
        reasoningSteps.push('Loaded user facts and patterns');
      }
    } catch (intelligenceError) {
      console.warn('[Johnny5] Memory intelligence failed:', intelligenceError);
      // Continue without enhanced memory
    }
    } // end else (legacy memory path)

    // 6.7. Compute memory status based on what actually happened
    if (!enableMemoryInjection) {
      memoryStatus = 'none';
    } else if (isLivingFilesEnabled()) {
      // Living files provide rich context via system prompt — always 'full' when enabled
      memoryStatus = 'full';
    } else if (searchType.includes('hybrid') || searchType.includes('vector')) {
      memoryStatus = 'full';
    } else if (searchType === 'keyword' || searchType === 'fts') {
      memoryStatus = 'partial';
    } else if (enableMemoryInjection && memoryContext === '' && factsAndPatternsContext === '') {
      memoryStatus = 'minimal';
    } else {
      // Facts/patterns context exists but no search results — DB accessible
      memoryStatus = 'minimal';
    }

    // 6.8. Detailed memory injection trace log
    console.log('[Johnny5] Memory injection trace:', {
      embeddingGenerated: searchType.includes('vector') || searchType.includes('hybrid'),
      embeddingProvider: process.env.GEMINI_API_KEY ? 'gemini' : 'none',
      searchResultsCount: memoriesUsed.length,
      searchType: searchType,
      formattedContextLength: memoryContext.length,
      factsContextLength: factsAndPatternsContext.length,
      totalInjectedChars: (memoryContext.length + factsAndPatternsContext.length),
      memoryStatus: memoryStatus,
    });

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

    // Add terminal context when present (Phase 2: Terminal Observation)
    if (terminalContext && typeof terminalContext === 'string' && terminalContext.length > 0) {
      const cappedContext = terminalContext.slice(0, 2000);
      contextParts.push(`## Recent Terminal Activity\n\`\`\`\n${cappedContext}\n\`\`\``);
      console.log('[Johnny5] Terminal context injected:', {
        length: terminalContext.length,
        capped: terminalContext.length > 2000,
        preview: terminalContext.substring(0, 100),
      });
      reasoningSteps.push('Including terminal context');
    }

    // Add active crew member context when user explicitly activated one via Crew Panel
    if (crewContext && typeof crewContext === 'object' && crewContext.name && crewContext.promptPrefix) {
      contextParts.push(
        `## Active Crew Member: ${crewContext.name}\nThe user has explicitly activated the ${crewContext.name} crew persona. Channel this persona for your response:\n${crewContext.promptPrefix}`
      );
      reasoningSteps.push(`Crew member active: ${crewContext.name}`);
    }

    if (contextParts.length > 0) {
      enhancedMessage = `${contextParts.join('\n\n')}\n\n---\n\n**User Query:**\n${message}`;
    }

    // Truncate enhanced message if too long for CLI (applies to ALL paths including Bridge)
    // NOTE: Bridge adds ~2KB system prompt + conversation history on top of this
    // Claude CLI has a strict prompt limit, so we need to be conservative here
    const MAX_ENHANCED_MESSAGE_LENGTH = 8000; // ~2k tokens, leaves room for Bridge additions
    let finalMessage = enhancedMessage;
    if (enhancedMessage.length > MAX_ENHANCED_MESSAGE_LENGTH) {
      console.log(`[Johnny5] Enhanced message too long (${enhancedMessage.length} chars), truncating...`);
      // Keep the user message, truncate context
      const userQueryMarker = '\n\n---\n\n**User Query:**\n';
      const userQueryIndex = enhancedMessage.lastIndexOf(userQueryMarker);
      if (userQueryIndex > 0) {
        const userQuery = enhancedMessage.slice(userQueryIndex);
        const maxContextLength = MAX_ENHANCED_MESSAGE_LENGTH - userQuery.length - 100;
        const truncatedContext = enhancedMessage.slice(0, maxContextLength) + '\n... [context truncated]';
        finalMessage = truncatedContext + userQuery;
      } else {
        finalMessage = enhancedMessage.slice(0, MAX_ENHANCED_MESSAGE_LENGTH);
      }
      console.log(`[Johnny5] Truncated to ${finalMessage.length} chars`);
    }

    let result: { success: boolean; response: string; error?: string; errorCode?: string };
    let modeUsed: 'bridge' | 'gemini' = 'bridge';

    // 7.5. Smart Query Routing - Classify query to determine optimal provider
    // Personal queries → Gemini (respects memory context)
    // Coding queries → Bridge (project awareness via Claude Code CLI)
    const queryClassification: ClassificationResult = classifyQuery(message);
    console.log('[Johnny5] Query classification:', {
      category: queryClassification.category,
      confidence: queryClassification.confidence.toFixed(2),
      shouldUseBridge: queryClassification.shouldUseBridge,
      reasoning: queryClassification.reasoning,
    });

    // Determine if we should use Bridge based on both connection status AND query type
    // Key insight: Even when Bridge is connected, personal queries should use Gemini
    // because Claude Code CLI ignores injected memory context
    const shouldUseBridgeForThisQuery = bridgeConnected && queryClassification.shouldUseBridge;

    if (shouldUseBridgeForThisQuery) {
      // Use Bridge for coding queries (benefits from project context)
      console.log('[Johnny5] Using Bridge mode (coding query)');
      reasoningSteps.push('Generating response via Claude Code CLI...');
      result = await johnny5Service.sendPrompt(finalMessage, conversationHistory);
    } else {
      // Use Gemini for:
      // 1. Personal/memory queries (even when Bridge is connected)
      // 2. All queries when Bridge is not connected
      if (bridgeConnected) {
        console.log(`[Johnny5] Bridge connected but using Gemini for ${queryClassification.category} query (memory-critical)`);
      } else {
        console.log('[Johnny5] Using Gemini API mode (Bridge not connected)');
      }
      // Use Gemini API (Google Gemini 2.5 Flash - respects memory context)
      modeUsed = 'gemini';
      try {
        // Detect Johnny5's active mode and available capabilities
        const johnny5Mode = detectJohnny5Mode(moltbotConnected, bridgeConnected);
        const systemPrompt = await generateJohnny5SystemPrompt(johnny5Mode, userId);

        console.log('[Johnny5] Active mode:', {
          mode: johnny5Mode.mode,
          hasMCP: johnny5Mode.hasMCP,
          provider: johnny5Mode.provider
        });
        reasoningSteps.push(`Generating response via ${johnny5Mode.provider}...`);

        // Build conversation history in Gemini format
        const geminiContents = [
          // System instruction as first user message (with mode-aware capabilities)
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          {
            role: 'model',
            parts: [{ text: 'Got it. I\'m Johnny5 - your personal AI in Coder1. I have memory about you and I\'m here to actually help, not just perform helpfulness. What do you need?' }],
          },
          // Add conversation history
          ...conversationHistory.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          // Add current message
          {
            role: 'user',
            parts: [{ text: finalMessage }],
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
          const { execSync, spawn: spawnAsync } = await import('child_process');
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
          // finalMessage is already truncated earlier, but apply additional CLI-specific truncation if needed
          let cliPrompt = finalMessage;
          const estimatedLength = finalMessage.length + 500; // +500 for system prefix
          if (estimatedLength > MAX_CLI_PROMPT_LENGTH) {
            console.log(`[Johnny5] CLI prompt still too long after pre-truncation (${estimatedLength} chars), applying CLI-specific truncation...`);
            cliPrompt = truncateForCLI(message, contextParts, MAX_CLI_PROMPT_LENGTH);
            console.log(`[Johnny5] CLI-specific truncated to ${cliPrompt.length} chars`);
          }

          let fullPrompt = '[SYSTEM] You are Johnny5, a helpful AI assistant. Be concise and helpful. Use any memory context provided to give relevant responses.\n\n';
          fullPrompt += cliPrompt;

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

            // Use async spawn to avoid blocking the Node.js event loop
            const cliResponse = await new Promise<string>((resolve, reject) => {
              const child = spawnAsync('claude', ['--print'], {
                env: cliEnv,
                cwd: '/tmp',
                stdio: ['pipe', 'pipe', 'pipe'],
              });

              let stdout = '';
              let stderr = '';

              child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
              child.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

              // 90-second timeout — kill the process if it hangs
              const timeout = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error('Claude CLI timed out after 90 seconds'));
              }, 90000);

              child.on('error', (err: Error) => {
                clearTimeout(timeout);
                reject(err);
              });

              child.on('close', (code: number | null) => {
                clearTimeout(timeout);
                if (code !== 0) {
                  const errorMsg = stderr || stdout || 'Unknown error';
                  reject(new Error(`CLI exited with code ${code}: ${errorMsg}`));
                } else {
                  resolve(stdout);
                }
              });

              // Pipe the prompt to stdin then close it
              child.stdin?.write(fullPrompt);
              child.stdin?.end();
            });
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
                { role: 'user', content: finalMessage },
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

    // 10.5. Post-response: update living files with conversation summary
    if (isLivingFilesEnabled()) {
      try {
        const timestamp = new Date().toISOString().split('T')[0];
        const memoryEntry = `\n### ${timestamp}\n- User asked: ${message.slice(0, 100)}${message.length > 100 ? '...' : ''}\n- Topic: ${session.id || 'general'}\n`;

        // Write via Bridge for authenticated users (files live on their machine)
        if (userId !== 'default' && bridgeManager?.hasBridgeForUser(userId)) {
          await bridgeManager.writeLivingFile(userId, 'MEMORY.md', memoryEntry, 'append');
        } else {
          // Dev mode fallback: write to local disk
          appendToLivingFile('MEMORY.md', memoryEntry);
        }
      } catch (err) {
        console.warn('[Johnny5] Failed to update MEMORY.md:', err);
      }
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

    // 11.5. Track usage for analytics
    try {
      await trackUsage({
        sessionId: session.id,
        source: modeUsed === 'bridge' ? 'direct' : 'fallback',
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        model: modeUsed === 'bridge' ? 'claude-code-cli' : 'gemini-2.5-flash',
      });
    } catch (usageError) {
      console.error('[Johnny5] Failed to track usage:', usageError);
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

    // 12.6. Increment Johnny5 message counter for authenticated users
    if (userId !== 'default') {
      try {
        const newCount = incrementJohnny5MessageCount(userId);
        console.log(`[Johnny5] Message count incremented for user ${userId}: ${newCount}`);
      } catch (counterError) {
        console.error('[Johnny5] Failed to increment message counter:', counterError);
        // Non-critical - continue
      }
    }

    // 12.5. After-Chat Memory Intelligence (NEW)
    // Run fact extraction asynchronously - don't block the response
    // This enables Johnny5 to learn from every conversation
    // CRITICAL: Capture userId in closure for async extraction
    const capturedUserId = userId;
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
        const existingFacts = await getExistingFacts(session.id, 30, capturedUserId);

        // Extract new facts from this conversation
        const newFacts = await extractFactsFromConversation(fullHistory, existingFacts);

        if (newFacts.length > 0) {
          await saveFacts(session.id, newFacts, undefined, capturedUserId);
          console.log(`[Johnny5] After-chat extraction: saved ${newFacts.length} new facts`);
        }

        // Run pattern detection every 10 conversations (approximately)
        const messageCount = history.length + 2;
        if (messageCount > 0 && messageCount % 20 === 0) {
          console.log('[Johnny5] Running pattern detection cycle...');
          const patternResult = await runPatternDetectionCycle(capturedUserId);
          console.log('[Johnny5] Pattern cycle:', patternResult);
        }
      } catch (extractionError) {
        console.error('[Johnny5] After-chat extraction error:', extractionError);
        // Non-blocking - don't affect the response
      }
    });

    // 13. Get updated quota for response
    let quotaInfo: ChatSuccessResponse['data']['quota'] = undefined;
    if (userId !== 'default') {
      const updatedQuota = getJohnny5Quota(userId);
      if (updatedQuota) {
        quotaInfo = {
          messageCount: updatedQuota.messageCount,
          limit: updatedQuota.limit === Infinity ? 999999 : updatedQuota.limit,
          remaining: updatedQuota.remaining === Infinity ? 999999 : updatedQuota.remaining,
          tierType: updatedQuota.tierType,
          isProSubscriber: updatedQuota.isProSubscriber,
        };
      }
    }

    // 14. Return success response
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
        memoryStatus,
        reasoningSteps: reasoningSteps.length > 1 ? reasoningSteps : undefined,
        quota: quotaInfo,
      },
    });
  } catch (error) {
    console.error('[Johnny5] Unexpected error in chat route:', error);
    return errorResponse('An unexpected error occurred', 'BRIDGE_ERROR', 500);
  }
}
