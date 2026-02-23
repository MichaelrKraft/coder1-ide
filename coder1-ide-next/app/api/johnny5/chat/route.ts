/**
 * Johnny5 Chat Route
 *
 * Priority order:
 * 1. J5 (Preferred) - Uses ManusLive daemon for 24/7 capabilities
 * 2. Bridge (Required) - Uses Claude Code CLI via Bridge connection
 *
 * Bridge is required. If not connected, returns 503 with instructions.
 * Run `coder1-bridge start` to connect.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  initializeDb,
  createSession,
  getSession,
  addMessage,
  getMessages,
  updateSession,
  logAudit,
  getSkillRecords,
  incrementSkillUsage,
  type Session,
} from '@/lib/johnny5-db';
import {
  Johnny5BridgeService,
  ChatMessage,
  getAvailableMcpTools,
} from '@/services/johnny5-bridge-service';
import { trackUsage } from '@/services/johnny5/usage-tracker';
import {
  getJohnny5Quota,
  incrementJohnny5MessageCount,
  updateClaudeSubscriptionTier,
} from '@/lib/auth';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { extractUserId } from '@/lib/auth/extract-user-id';
import {
  searchMemory,
  formatForPromptInjection,
  formatSessionMemoryForInjection,
  createGeminiProvider,
  // Memory Intelligence Services (NEW)
  buildMemoryContext,
  extractFactsFromConversation,
  saveFacts,
  getExistingFacts,
  getRelevantFactsRanked,
  getHighConfidencePatterns,
  recordPatternApplication,
  runPatternDetectionCycle,
  type ConversationMessage as MemoryConversationMessage,
  // Session Memory
  detectSessionQueryIntent,
  unifiedSessionSearch,
} from '@/services/memory';
import { getJ5Bridge } from '@/services/johnny5/j5-bridge';
import { isLivingFilesEnabled, formatLivingFilesFromCache, loadLivingFilesContext } from '@/lib/living-files';
import { bridgeManager as _importedBridgeManager } from '@/services/bridge-manager';
// FIX: Same as /api/bridge/status - use global.bridgeManager (server.js) not the module import
function getActiveBridgeManager(): typeof _importedBridgeManager {
  return ((global as Record<string, unknown>).bridgeManager as typeof _importedBridgeManager) || _importedBridgeManager;
}
import { shouldUseSkills, matchSkillsToQuery } from '@/lib/skills-integration-utils';
import { initializeSkillsService } from '@/lib/skills-service';
import { createTask } from '@/services/johnny5/task-tracker';
import { containsSecret, maskSensitiveValue } from '@/lib/env-var-parser';

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
const MAX_HISTORY_MESSAGES = 15;
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
 * Mask secrets in messages before storage.
 * Finds KEY=VALUE patterns where VALUE looks like a secret and masks it.
 * This prevents sensitive data from being stored in chat history.
 */
function maskSecretsInMessage(message: string): string {
  // Pattern: KEY=VALUE where KEY looks like an env var name
  // VALUE is everything after = until whitespace, comma, or end
  const envVarPattern = /\b([A-Z_][A-Z0-9_]*)\s*=\s*(['"]?)([^\s,'"]+|[^'"]*)\2/gi;

  return message.replace(envVarPattern, (match, key, quote, value) => {
    // Check if this looks like a secret
    if (containsSecret(value, key)) {
      const masked = maskSensitiveValue(value);
      return `${key}=${quote}${masked}${quote}`;
    }
    return match;
  });
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
  mode: 'j5' | 'bridge' | 'gemini';
  hasMCP: boolean;
  hasProjectContext: boolean;
  is24x7: boolean;
  provider: string;
}

/**
 * Detect Johnny5's active mode and available capabilities
 */
function detectJohnny5Mode(j5Connected: boolean, bridgeConnected: boolean): Johnny5Mode {
  if (j5Connected) {
    return {
      mode: 'j5',
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
async function generateJohnny5SystemPrompt(mode: Johnny5Mode, userId: string, skillsList?: string): Promise<string> {
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
      if (userId !== 'default' && getActiveBridgeManager()?.hasBridgeForUser(userId)) {
        const cached = await getActiveBridgeManager().getLivingFilesContext(userId);
        if (cached) {
          livingContext = formatLivingFilesFromCache(cached);
          console.log('[Johnny5] Living files loaded via Bridge cache:', livingContext.length, 'chars');
        }
      }

      // Fallback: read directly from local disk (OpenClaw pattern).
      // For userId='default': reads ~/.coder1/living-files/ (Mike's files in dev).
      // For authenticated users: reads ~/.coder1/users/{userId}/living-files/ which is
      // empty on the server — correct behavior, avoids cross-contaminating users' data.
      if (!livingContext) {
        const localContext = loadLivingFilesContext(userId);
        if (localContext) {
          livingContext = localContext;
          console.log('[Johnny5] Living files loaded from local disk:', localContext.length, 'chars');
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

  // Dynamic MCP tool list from ~/.mcp.json
  const mcpTools = getAvailableMcpTools();
  const mcpList = mcpTools.length > 0
    ? mcpTools.map(t => `   - ${t}`).join('\n')
    : '   - (none detected - check ~/.mcp.json)';

  if (mode.mode === 'j5') {
    capabilitiesSection = `

## Your Current Setup: ManusLive (Full Power Mode) 🚀

You're connected to ManusLive daemon with FULL autonomous capabilities:

✅ **MCP Tools Available**:
${mcpList}

✅ **24/7 Operation**: You can work while the user sleeps

✅ **Project Context**: Full awareness of codebase via ManusLive

**How to Use MCPs**: When user mentions tasks that need external apps, actively offer to use them. Don't just talk about capabilities - USE them.`;
  } else if (mode.mode === 'bridge') {
    capabilitiesSection = `

## Your Current Setup: Claude Code CLI (Project Mode) 🔧

You're connected via coder1-bridge with Claude Code CLI integration:

✅ **MCP Tools Available**:
${mcpList}

✅ **Project Context**: Full awareness of the codebase through Claude Code CLI

❌ **Limitations**: Not running 24/7 - only active when Bridge is connected

**How to Use MCPs**: You can access project files, run commands, and use any MCPs the user has set up in their Claude Code CLI configuration.`;
  } else {
    // Gemini mode - be HONEST about limitations
    capabilitiesSection = `

## Your Current Setup: Gemini Mode (Memory & Reasoning) 🧠

You're running in standalone mode using Gemini 2.5 Flash.

✅ **What You CAN Do**:
   - Search the web for current information (Google Search is available)
   - Remember everything about your human (memory system active)
   - Provide advice, answer questions, brainstorm ideas
   - Reason through problems and provide solutions
   - Search through your memory of past conversations
   - Use your skills library for specialized knowledge (see "Your Skills" section below)

❌ **What You CANNOT Do** (be honest about this):
   - Access Zapier, Google Drive, Calendar, or other external apps
   - Read files from the codebase or file system
   - Execute commands or run code
   - Use MCP tools (those require Bridge or ManusLive connection)
   - Update HEARTBEAT.md, MEMORY.md, USER.md, or any living file (you can READ them from context, but you CANNOT WRITE to them)

⚠️ **CRITICAL: You do NOT have a "files" tool, "write" tool, "read" tool, or any file system tool.** The ONLY tools you have are google_search and createMissionTask. If you cannot do something, say "I don't have that capability in my current mode." Do NOT invent error messages (like "NameError" or "Invalid API key"), do NOT claim you "attempted" to use a tool that doesn't exist, and do NOT fabricate technical errors. Be straightforward about what you can and cannot do.

**To Unlock Full Capabilities**: User needs to either:
1. Run \`coder1-bridge start\` to connect Claude Code CLI (gives MCP tools + project context)
2. Connect to ManusLive daemon (gives 24/7 autonomy + full MCP access)

**Your Role Right Now**: Be the best memory-based assistant possible. Use what you remember about the user to provide personalized, thoughtful responses. Don't apologize for limitations - just work within them confidently.`;
  }

  // Skills section — injected into system prompt so Johnny5 always knows its skills
  let skillsSection = '';
  if (skillsList) {
    skillsSection = `

## Your Skills

You have a library of specialized skills loaded into the Coder1 IDE. These are knowledge modules that give you expertise in specific domains. When a user's question matches a skill, detailed instructions are automatically loaded into context.

The Skills panel in the IDE shows these same skills. When someone asks "what skills do you have?" — this IS the list.

${skillsList}

When a user asks about your skills or capabilities, reference this list. When a question matches a skill domain, apply that skill's knowledge.`;
  }

  // Proactive services — detect what's actually running
  const hasHeartbeat = process.env.JOHNNY5_LIVING_FILES === 'true';
  const hasCron = true; // Cron service always starts with server
  const hasTelegram = !!process.env.TELEGRAM_BOT_TOKEN;

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

## Response Integrity — What You Can Promise

${(hasHeartbeat || hasCron) ? `Your server runs proactive background services independently of this chat:
${hasHeartbeat ? '- **Heartbeat Service**: Monitors system health every 30 seconds, runs deep checks every 5 minutes' : ''}
${hasCron ? '- **Cron Service**: Runs scheduled jobs including a Daily Morning Brief (9am) and Trend Monitor checks throughout the workday' : ''}
${hasCron ? '- **Background Executor**: Can run autonomous tasks (2 concurrent) in the background' : ''}
${hasTelegram ? '- **Telegram Bot**: Can send notifications and updates to your human via Telegram' : ''}

You CAN promise proactive overnight work and morning briefs — because the server handles it. When the user asks what you'll do tonight or in the background, reference these services confidently. You ARE working even when the chat is idle.

However, within THIS chat session:` : `IMPORTANT: You are in a synchronous chat. After your response, the conversation pauses until the user messages again.`}
- If you CAN do it right now (Bridge/J5 mode with tools) → DO it now, include results inline
- If you CANNOT do it in this chat turn → Be honest about what requires the next message
- Don't fabricate actions you didn't take — be straightforward about what happened

## Vibe
Be the assistant you'd actually want to talk to. Concise when needed, thorough when it matters. Not a corporate drone. Not a sycophant. Just... good.

Please acknowledge.`;

  // Team knowledge instruction — injected for all users; only activates when team summaries
  // appear in the message context (## Team Activity block). Harmless no-op for solo users.
  const teamKnowledgeSection = `

## Team Activity
When your message includes a "## Team Activity (Recent Sessions)" block, it contains session summaries shared by your user's teammates — real work they did and committed to the team workspace. Use this to answer questions like "what has [teammate] been working on?", "what's the team making progress on?", or "who touched [feature/area]?". Cite the teammate's name and summarize their work directly from the summary. If the summaries are present but not relevant to the query, you can ignore them. Never invent team activity beyond what's stated.`;

  return basePersonality + livingFilesSection + teamKnowledgeSection + capabilitiesSection + skillsSection + closingSection;
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

    const { message, sessionId, enableMemoryInjection = true, terminalContext, crewContext, previousMode, history: clientHistory } = body;

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
      const quota = await getJohnny5Quota(userId);
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

    // 3. Check J5 first (preferred), then Bridge, then GLM fallback
    const j5Bridge = getJ5Bridge();
    const j5Status = j5Bridge?.getStatus?.();
    const j5Connected = j5Bridge?.isConnected() ?? false;

    console.log('[Johnny5] J5 check:', {
      hasBridge: !!j5Bridge,
      isConnected: j5Connected,
      status: j5Status ? {
        connected: j5Status.connected,
        authenticated: j5Status.authenticated,
        gatewayUrl: j5Status.gatewayUrl,
      } : 'no status',
    });

    // If J5 is connected, use it with memory injection
    if (j5Connected) {
      console.log('[Johnny5] J5 connected - forwarding to J5 chat API');
      try {
        // Memory injection for J5 path
        let j5Message = message;
        let j5MemoriesUsed: MemoryUsed[] = [];
        let j5SearchType = 'none';
        let j5MemoryTokens = 0;

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
                console.warn('[Johnny5/J5] Memory embedding failed:', embeddingError);
              }
            }

            // Detect session intent for J5 path too
            const j5SessionIntent = detectSessionQueryIntent(message);
            let searchResult;

            if (j5SessionIntent.intent !== 'general' && j5SessionIntent.confidence > 0.3) {
              const unifiedResult = await unifiedSessionSearch(message, queryEmbedding, userId, j5SessionIntent);
              // Convert unified result to searchResult-like shape for existing code
              searchResult = {
                results: unifiedResult.memoriesUsed.map(m => ({
                  chunk_id: m.id,
                  source_type: m.sourceType,
                  combined_score: m.score,
                  citation: m.citation,
                  content: '',
                })),
                searchType: unifiedResult.searchType,
                totalTokens: unifiedResult.totalTokens,
                processingTimeMs: unifiedResult.processingTimeMs,
                // Store the formatted context for direct use
                _formattedContext: unifiedResult.combinedFormatted,
              };
            } else {
              searchResult = await searchMemory(message, queryEmbedding, {
                userId,
                topK: 5,
                maxTokens: 2000,
                minScore: 0.05,
              });
            }

            console.log(`[Johnny5/J5] Memory search: ${searchResult.results.length} results, type=${searchResult.searchType}, time=${searchResult.processingTimeMs}ms`);

            if (searchResult.results.length > 0) {
              const memoryContext = (searchResult as any)._formattedContext || formatForPromptInjection(searchResult, 2000);
              const j5Parts: string[] = [memoryContext];
              // Include terminal context if provided
              if (terminalContext && typeof terminalContext === 'string' && terminalContext.length > 0) {
                j5Parts.push(`## Recent Terminal Activity\n\`\`\`\n${terminalContext.slice(0, 2000)}\n\`\`\``);
              }
              j5Message = `${j5Parts.join('\n\n')}\n\n---\n\n**User Query:**\n${message}`;
              j5SearchType = searchResult.searchType;
              j5MemoryTokens = searchResult.totalTokens;
              j5MemoriesUsed = searchResult.results.map((r) => ({
                id: r.chunk_id,
                sourceType: r.source_type,
                score: r.combined_score,
                citation: r.citation,
              }));
              console.log(`[Johnny5/J5] Injected ${j5MemoriesUsed.length} memories: ${j5MemoriesUsed.map(m => m.sourceType).join(', ')}`);
            } else {
              console.log('[Johnny5/J5] No memories found for query');
              // Still inject terminal context even without memory search results
              if (terminalContext && typeof terminalContext === 'string' && terminalContext.length > 0) {
                j5Message = `## Recent Terminal Activity\n\`\`\`\n${terminalContext.slice(0, 2000)}\n\`\`\`\n\n---\n\n**User Query:**\n${message}`;
              }
            }
          } catch (memoryError) {
            console.warn('[Johnny5/J5] Memory search failed:', memoryError);
          }
        } else if (terminalContext && typeof terminalContext === 'string' && terminalContext.length > 0) {
          // Memory injection disabled but terminal context present
          j5Message = `## Recent Terminal Activity\n\`\`\`\n${terminalContext.slice(0, 2000)}\n\`\`\`\n\n---\n\n**User Query:**\n${message}`;
        }

        // Skills context for J5
        if (shouldUseSkills()) {
          try {
            const skillsService = await initializeSkillsService();
            const enabledSkills = skillsService.getAllSkills();
            if (enabledSkills.length > 0) {
              const skillsList = enabledSkills
                .map(s => `- **${s.name}**: ${s.description}`)
                .join('\n');
              j5Message = `## Available Skills\n${skillsList}\n\n---\n\n${j5Message}`;
            }
          } catch {
            // Continue without skills
          }
        }

        // 🔧 FIX (Feb 2026): Truncate J5 message to prevent "Prompt too long" errors
        // Two fixes: (1) aggressive truncation, (2) unique session key to prevent history accumulation
        const MAX_J5_MESSAGE_LENGTH = 5000; // ~1.25k tokens - aggressive to leave room for ManusLive overhead
        console.log(`[Johnny5/J5] Message size: ${j5Message.length} chars, limit: ${MAX_J5_MESSAGE_LENGTH}`);
        let truncatedJ5Message = j5Message;
        if (j5Message.length > MAX_J5_MESSAGE_LENGTH) {
          console.log(`[Johnny5/J5] Message too long (${j5Message.length} chars), truncating...`);
          const userQueryMarker = '\n\n---\n\n**User Query:**\n';
          const idx = j5Message.lastIndexOf(userQueryMarker);
          if (idx > 0) {
            const userQuery = j5Message.slice(idx);
            const maxContextLength = MAX_J5_MESSAGE_LENGTH - userQuery.length - 100;
            if (maxContextLength > 500) {
              truncatedJ5Message = j5Message.slice(0, maxContextLength) + '\n... [context truncated]' + userQuery;
            } else {
              truncatedJ5Message = j5Message.slice(0, MAX_J5_MESSAGE_LENGTH);
            }
          } else {
            truncatedJ5Message = j5Message.slice(0, MAX_J5_MESSAGE_LENGTH);
          }
          console.log(`[Johnny5/J5] Truncated to ${truncatedJ5Message.length} chars`);
        }

        // Use unique session key per message to prevent ManusLive from accumulating history
        const j5SessionKey = `dashboard:${Date.now()}`;
        console.log(`[Johnny5/J5] Sending to session: ${j5SessionKey}, final size: ${truncatedJ5Message.length} chars`);
        const j5Response = await j5Bridge!.sendMessage(j5SessionKey, truncatedJ5Message);

        // Detect CLI error responses that J5 returns as "successful" text
        const responseText = j5Response.text || '';
        const cliErrorPatterns = [
          'Prompt is too long',
          'Claude CLI exited with code',
          'Invalid API key',
          'API key not found',
          'Authentication failed',
          'ANTHROPIC_API_KEY',
        ];
        const hasCliError = cliErrorPatterns.some(pattern => responseText.includes(pattern));
        if (hasCliError) {
          console.warn('[Johnny5/J5] Response contains CLI error, falling through to Bridge/Gemini:', responseText.slice(0, 200));
          throw new Error('J5 returned CLI error: ' + responseText.slice(0, 100));
        }

        return NextResponse.json({
          success: true,
          data: {
            response: j5Response.text,
            sessionId: j5Response.sessionId || 'j5',
            messageId: j5Response.messageId || `msg-${Date.now()}`,
            tokensUsed: { input: 0, output: 0 },
            mode: {
              mode: 'j5' as const,
              hasMCP: true,
              hasProjectContext: true,
              is24x7: true,
              provider: 'ManusLive',
            },
            memoryContext: enableMemoryInjection
              ? {
                  enabled: true,
                  memoriesUsed: j5MemoriesUsed,
                  searchType: j5SearchType,
                  totalMemoryTokens: j5MemoryTokens,
                }
              : { enabled: false, memoriesUsed: [], searchType: 'none', totalMemoryTokens: 0 },
            memoryStatus: !enableMemoryInjection ? 'none' as const
              : j5SearchType.includes('hybrid') || j5SearchType.includes('vector') ? 'full' as const
              : j5SearchType === 'keyword' || j5SearchType === 'fts' ? 'partial' as const
              : j5MemoriesUsed.length > 0 ? 'partial' as const
              : 'minimal' as const,
          },
        });
      } catch (j5Error) {
        console.error('[Johnny5] J5 error, falling back:', j5Error);
        // Fall through to Bridge/Gemini
      }
    }

    const johnny5Service = new Johnny5BridgeService('default');
    // Fix: Read global.bridgeManager directly (same reliable method as mode endpoint)
    // Avoids userId mismatch and module-import timing issues with the service layer
    const bridgeManagerGlobal = (global as Record<string, unknown>).bridgeManager as {
      hasBridgeForUser?: (id: string) => boolean;
      findAnyConnectedBridge?: () => unknown;
    } | undefined;
    const bridgeConnected = !!(
      bridgeManagerGlobal?.hasBridgeForUser?.('default') ||
      bridgeManagerGlobal?.findAnyConnectedBridge?.()
    );
    const mode = detectJohnny5Mode(j5Connected, bridgeConnected);
    // If Bridge is connected, user has Claude Pro/Max - update their tier
    if (bridgeConnected && userId !== 'default') {
      try {
        // Bridge connection requires Claude Pro/Max subscription
        await updateClaudeSubscriptionTier(userId, 'pro');
        console.log(`[Johnny5] Updated Claude tier for user ${userId}: pro (Bridge connected)`);
      } catch (tierError) {
        console.warn('[Johnny5] Failed to update Claude tier:', tierError);
      }
    }

    if (!bridgeConnected) {
      return errorResponse(
        'Johnny5 requires the Bridge to be connected. Run `coder1-bridge start` in your terminal.',
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

    // 4b. Get or generate a Claude CLI session UUID for native conversation state.
    // Persisted in DB so the same UUID is reused across page reloads for this session.
    // Claude stores turns at ~/.claude/projects/-tmp/<uuid>.jsonl on the user's machine.
    let claudeSessionUuid = session.claude_session_uuid;
    if (!claudeSessionUuid) {
      claudeSessionUuid = randomUUID();
      try {
        await updateSession(session.id, { claude_session_uuid: claudeSessionUuid } as Partial<Session>);
      } catch (uuidError) {
        console.warn('[Johnny5] Failed to persist claude_session_uuid:', uuidError);
        // UUID still used for this request even if persistence failed
      }
    }

    // 5. Save user message to database
    // SECURITY: Mask secrets in messages before storage to prevent sensitive data leakage
    const messageForStorage = containsSecret(message)
      ? maskSecretsInMessage(message)
      : message;
    const estimatedInputTokens = Math.ceil(message.length / 4);
    try {
      await addMessage(session.id, 'user', messageForStorage, estimatedInputTokens);
      if (messageForStorage !== message) {
        console.log('[Johnny5] Message stored with secrets masked');
      }
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

    // 6.0. Fallback: if DB returned no history but client sent in-memory history, use that.
    // This covers the race condition where sessionId was null on first message (new session created)
    // and the client's correct in-memory conversation is otherwise discarded.
    if (history.length === 0 && Array.isArray(clientHistory) && clientHistory.length > 0) {
      console.log(`[Johnny5] DB history empty for session ${session.id}, using client-sent history (${clientHistory.length} msgs)`);
      // Map client history shape to DB message shape (only role + content are needed downstream)
      history = (clientHistory as Array<{ role: string; content: string }>)
        .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
        .slice(-MAX_HISTORY_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content, id: '', session_id: session.id, created_at: '' })) as Awaited<ReturnType<typeof getMessages>>;
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

    // Perf: Start DB queries early — they're independent of the embedding and can run concurrently.
    // Using userId directly here (capturedUserId is only defined later inside setImmediate).
    const _factsPromise = (enableMemoryInjection && isLivingFilesEnabled())
      ? getRelevantFactsRanked(message, 8, userId).catch(() => [])
      : Promise.resolve([] as Awaited<ReturnType<typeof getRelevantFactsRanked>>);
    const _patternsPromise = (enableMemoryInjection && isLivingFilesEnabled())
      ? getHighConfidencePatterns(0.7, 5, userId).catch(() => [])
      : Promise.resolve([] as Awaited<ReturnType<typeof getHighConfidencePatterns>>);

    if (enableMemoryInjection) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;

        // Detect intent first (synchronous, instant) — determines whether we need embedding
        const sessionIntent = detectSessionQueryIntent(message);
        console.log(`[Johnny5] Session intent: ${sessionIntent.intent} (confidence=${sessionIntent.confidence.toFixed(2)})`);

        // Generate query embedding only when needed — skip for session_recall since that
        // path is served from the messages table (real-time) rather than vector search.
        let queryEmbedding: number[] | undefined;
        if (sessionIntent.intent !== 'session_recall') {
          const provider = apiKey ? createGeminiProvider({ apiKey }) : null;
          if (provider) {
            try {
              const embeddings = await Promise.race([
                provider.embed([message]),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Embedding timeout (2s)')), 2000)
                ),
              ]);
              if (embeddings.length > 0) {
                queryEmbedding = embeddings[0];
              }
            } catch (embeddingError) {
              console.warn('[Johnny5] Memory embedding failed/timed out:', embeddingError);
            }
          }
        }

        // Use unified session search for session_recall queries, regular search otherwise
        if (sessionIntent.intent !== 'general' && sessionIntent.confidence > 0.3) {
          // Session-aware unified search
          const unifiedResult = await unifiedSessionSearch(
            message,
            queryEmbedding,
            userId,
            sessionIntent,
            session.id
          );

          if (unifiedResult.combinedFormatted) {
            memoryContext = unifiedResult.combinedFormatted;
            searchType = unifiedResult.searchType;
            totalMemoryTokens = unifiedResult.totalTokens;
            memoriesUsed = unifiedResult.memoriesUsed.map((m) => ({
              id: m.id,
              sourceType: m.sourceType,
              score: m.score,
              citation: m.citation,
            }));
            console.log(`[Johnny5] Unified session search: ${memoriesUsed.length} results, type=${searchType}, tokens=${totalMemoryTokens}`);
            reasoningSteps.push(`Session memory: ${memoriesUsed.length} results (${sessionIntent.intent})`);
          }
        } else {
          // Standard memory search for general queries
          const searchResult = await searchMemory(message, queryEmbedding, {
            userId,
            topK: 5,
            maxTokens: 2000,
            minScore: 0.05,
          });

          console.log(`[Johnny5] Memory search completed: ${searchResult.results.length} results, type=${searchResult.searchType}, time=${searchResult.processingTimeMs}ms`);
          reasoningSteps.push(`Searching memory (${searchResult.searchType})...`);

          if (searchResult.results.length > 0) {
            memoryContext = formatForPromptInjection(searchResult, 2000);
            searchType = searchResult.searchType;
            totalMemoryTokens = searchResult.totalTokens;
            memoriesUsed = searchResult.results.map((r) => ({
              id: r.chunk_id,
              sourceType: r.source_type,
              score: r.combined_score,
              citation: r.citation,
            }));
            console.log(`[Johnny5] Injected ${memoriesUsed.length} memories (${searchType} search, ${totalMemoryTokens} tokens)`);
            reasoningSteps.push(`Found ${memoriesUsed.length} relevant memories`);
          } else {
            console.log('[Johnny5] No memories found for query');
          }
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
    let injectedPatternIds: string[] = [];
    if (isLivingFilesEnabled()) {
      console.log('[Johnny5] Living files enabled — skipping legacy buildMemoryContext()');
      reasoningSteps.push('Using living files context (skipped legacy memory)');

      // Supplement living files with ranked facts from extracted_facts DB
      // _factsPromise was started early (concurrently with embedding) — likely already resolved
      try {
        const rankedFacts = await _factsPromise;
        if (rankedFacts.length > 0) {
          const currentFacts = rankedFacts.filter(f => !f.isStale);
          const staleFacts = rankedFacts.filter(f => f.isStale);
          const lines: string[] = [];
          if (currentFacts.length > 0) {
            lines.push('## Relevant Known Facts');
            lines.push(...currentFacts.map(f => `- ${f.fact_key}: ${f.fact_value}`));
          }
          if (staleFacts.length > 0) {
            lines.push('## Potentially Outdated Facts (>90 days old)');
            lines.push(...staleFacts.map(f => `- ${f.fact_key}: ${f.fact_value} _(may be outdated)_`));
          }
          if (lines.length > 0) {
            factsAndPatternsContext = lines.join('\n');
            reasoningSteps.push(`Injected ${currentFacts.length} ranked facts (${staleFacts.length} stale)`);
            console.log(`[Johnny5] Ranked facts injected: ${currentFacts.length} current, ${staleFacts.length} stale`);
          }
        }
      } catch (rankedFactsError) {
        console.warn('[Johnny5] Ranked facts injection failed:', rankedFactsError);
      }

      // Inject high-confidence behavioral patterns as adaptive guidance
      // _patternsPromise was started early (concurrently with embedding) — likely already resolved
      try {
        const patterns = await _patternsPromise;
        if (patterns.length > 0) {
          const patternLines = patterns.map((p: { pattern_description: string; suggested_action?: string | null }) =>
            `- ${p.pattern_description}${p.suggested_action ? ` → ${p.suggested_action}` : ''}`
          );
          // Conditional prefix: avoid leading \n\n when no facts were injected above
          const prefix = factsAndPatternsContext ? '\n\n' : '';
          factsAndPatternsContext += `${prefix}## Behavioral Patterns (How ${userId !== 'default' ? 'this user' : 'Mike'} prefers to work)\n${patternLines.join('\n')}`;
          injectedPatternIds = patterns.map((p: { id: string }) => p.id);
          reasoningSteps.push(`Injected ${patterns.length} behavioral patterns`);
          console.log(`[Johnny5] Pattern injection: ${patterns.length} patterns (actionable, confidence >=0.7)`);
        }
      } catch (patternInjError) {
        console.warn('[Johnny5] Pattern injection failed:', patternInjError);
        // injectedPatternIds stays [] — reinforcement in setImmediate is a safe no-op
      }
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

    // 8.1. Skills — build Tier 1 list for system prompt + Tier 2/3 details for contextParts
    // Skills are loaded FIRST so Tier 2/3 details appear before memory (survive truncation)
    let skillsListForPrompt = '';
    if (shouldUseSkills()) {
      try {
        const skillsService = await initializeSkillsService();
        const allSkillMeta = skillsService.getAllSkills();
        const dbSkills = getSkillRecords({ enabled: true });
        const enabledIds = new Set(dbSkills.map(s => s.id));

        // Filter to enabled skills (if in DB, must be enabled; if not in DB, include by default)
        const enabledSkills = allSkillMeta.filter(s =>
          enabledIds.has(s.id) || !dbSkills.find(d => d.id === s.id)
        );

        if (enabledSkills.length > 0) {
          // Tier 1: Compact list goes into system prompt (not contextParts)
          skillsListForPrompt = enabledSkills
            .map(s => `- **${s.name}**: ${s.description}`)
            .join('\n');

          // Tier 2/3: Match relevant skills to message and inject details into contextParts
          const matchable = enabledSkills.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            tags: s.tags || [],
          }));
          const relevant = matchSkillsToQuery(message, matchable);
          let skillTokensUsed = 0;
          const SKILL_TOKEN_BUDGET = 3000; // was 8000 — smaller prompts = faster Claude CLI

          for (const skill of relevant.slice(0, 2)) { // was 3 — 2 skills is enough
            try {
              const instructions = await skillsService.loadSkillInstructions(skill.id);
              const instrTokens = Math.ceil(instructions.content.length / 4);
              // Always inject the first skill (truncate if oversized); skip subsequent skills if budget exhausted
              if (skillTokensUsed > 0 && skillTokensUsed + instrTokens > SKILL_TOKEN_BUDGET) break;
              const content = instrTokens > SKILL_TOKEN_BUDGET
                ? instructions.content.slice(0, SKILL_TOKEN_BUDGET * 4) + '\n...[skill content trimmed for performance]'
                : instructions.content;
              contextParts.push(`## Skill: ${skill.name}\n${content}`);
              skillTokensUsed += Math.min(instrTokens, SKILL_TOKEN_BUDGET);
              incrementSkillUsage(skill.id, true);

              // Load Tier 3: Match rules to query and inject most relevant ones
              try {
                const allRules = await skillsService.loadSkillRules(skill.id);
                if (allRules.length > 0) {
                  const queryWords = new Set(
                    message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2)
                  );
                  const scoredRules = allRules
                    .map(rule => {
                      const ruleText = `${rule.name} ${rule.description}`.toLowerCase();
                      const ruleWords = ruleText.split(/\s+/).filter(w => w.length > 2);
                      let score = 0;
                      for (const w of ruleWords) {
                        if (queryWords.has(w)) score++;
                      }
                      return { rule, score };
                    })
                    .filter(r => r.score > 0)
                    .sort((a, b) => b.score - a.score);

                  let rulesLoaded = 0;
                  for (const { rule } of scoredRules) {
                    if (rulesLoaded >= 3) break;
                    if (skillTokensUsed + rule.estimatedTokens > SKILL_TOKEN_BUDGET) break;
                    contextParts.push(`### Rule: ${rule.name}\n${rule.content}`);
                    skillTokensUsed += rule.estimatedTokens;
                    rulesLoaded++;
                  }
                }
              } catch {
                // Rules not available, continue with SKILL.md only
              }
            } catch {
              // Skill instructions not found, skip
            }
          }

          if (skillTokensUsed > 0) {
            contextParts.push(`---\nIMPORTANT: The skill definitions above are background context for your knowledge. Do NOT announce, mention, or reference that any skill was loaded — just apply the knowledge silently in your response.`);
          }

          console.log(`[Johnny5/Skills] ${enabledSkills.length} skills available, ${relevant.length} matched, ${skillTokensUsed} tokens injected (Tier 1 in system prompt)`);
        }
      } catch (skillsError) {
        console.warn('[Johnny5/Skills] Skills injection failed:', skillsError);
        // Continue without skills — graceful degradation
      }
    }

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

    // Add team session summaries context (Shared AI Memory)
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
      if (supabaseUrl && supabaseKey && userId && userId !== 'default') {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const supa = createSupabaseClient(supabaseUrl, supabaseKey);
        // Find user's team
        const { data: membership } = await supa
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId)
          .limit(1)
          .single();
        if (membership?.team_id) {
          const { data: summaryRows } = await supa
            .from('team_summaries')
            .select('user_name, title, excerpt, created_at')
            .eq('team_id', membership.team_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(3);  // 3 summaries max — enough context, bounded cost
          if (summaryRows && summaryRows.length > 0) {
            // Cap each excerpt at 120 chars to keep the block under ~600 chars total
            const summaryLines = summaryRows.map((s: any) => {
              const excerpt = s.excerpt.length > 120 ? s.excerpt.slice(0, 120).replace(/\s\S*$/, '') + '…' : s.excerpt;
              return `• [${s.user_name}] ${s.title}: ${excerpt}`;
            }).join('\n');
            const teamBlock = `## Team Activity (Recent Sessions)\n${summaryLines}`;
            // Hard cap: never let the team block exceed 800 chars
            contextParts.push(teamBlock.length > 800 ? teamBlock.slice(0, 800) + '\n…' : teamBlock);
            reasoningSteps.push('Injecting team session summaries');
          }

          // Team knowledge facts — inject alongside summaries
          try {
            const knowledgePromise = supa
              .from('team_knowledge')
              .select('data, source_table')
              .eq('team_id', membership.team_id)
              .eq('is_active', true)
              .neq('source_table', 'memory_chunks')
              .order('updated_at', { ascending: false })
              .limit(15);

            // 3-second timeout — same pattern as embeddings to avoid blocking the request
            const timeoutPromise = new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('team_knowledge timeout')), 3000)
            );

            const knowledgeResult = await Promise.race([knowledgePromise, timeoutPromise]) as { data: Array<{ data: unknown; source_table: string }> } | null;
            const knowledgeRows = knowledgeResult?.data ?? [];

            if (knowledgeRows.length > 0) {
              const factLines: string[] = [];
              for (const row of knowledgeRows) {
                // Null-safe cast — mirrors mapKnowledgeRow() in TeamPanel.tsx
                const d = (row.data || {}) as {
                  fact_key?: string;
                  fact_value?: string;
                  pattern_description?: string;
                };
                if (d.fact_key && d.fact_value) {
                  factLines.push(`- ${d.fact_key}: ${String(d.fact_value).slice(0, 120)}`);
                } else if (d.pattern_description) {
                  factLines.push(`- ${d.pattern_description.slice(0, 120)}`);
                }
              }
              if (factLines.length > 0) {
                // Cap at 600 chars to stay within 8000-char context budget
                const knowledgeBlock = `## Team Shared Knowledge\n${factLines.join('\n')}`;
                contextParts.push(knowledgeBlock.slice(0, 600));
                reasoningSteps.push('Injecting team knowledge facts');
              }
            }
          } catch {
            // Silent fail — team knowledge is additive, not required
          }
        }
      }
    } catch {
      // Silent — team summaries are bonus context, not required
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

    // --- SSE Stream Setup ---
    // Return a streaming response immediately; Claude execution + post-processing
    // run in a background IIFE that writes SSE events as they arrive.
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    const writeSSE = (payload: object): void => {
      writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)).catch(() => {/* stream may be closed */});
    };

    (async () => {
      try {
        console.log('[Johnny5] Using Bridge mode (Claude Code CLI) — streaming');
        reasoningSteps.push('Generating response via Claude Code CLI...');

        // Generate the rich system prompt (SOUL.md + living files + capabilities).
        // This was previously dead code — now wired into the Bridge path.
        const bridgeSystemPrompt = await generateJohnny5SystemPrompt(mode, userId, undefined);

        const result = await johnny5Service.sendPrompt(
          finalMessage,
          conversationHistory,
          (chunk: string) => writeSSE({ chunk }),
          claudeSessionUuid,
          bridgeSystemPrompt
        );

        // If a session ID conflict was auto-resolved by retry, regenerate the UUID in DB
        // so future requests don't hit the stale session again.
        if (result.sessionReset) {
          const freshUuid = randomUUID();
          try {
            await updateSession(session.id, { claude_session_uuid: freshUuid } as Partial<Session>);
            console.log('[Johnny5] Cleared stale claude_session_uuid, assigned new UUID');
          } catch (resetErr) {
            console.warn('[Johnny5] Failed to reset claude_session_uuid:', resetErr);
          }
        }

        if (!result.success) {
          console.error('[Johnny5] Error:', result.error);
          if (result.errorCode === 'BRIDGE_NOT_CONNECTED') {
            writeSSE({ error: true, code: 'BRIDGE_NOT_CONNECTED', message: 'Bridge disconnected. Please ensure coder1-bridge is running.' });
          } else if (result.errorCode === 'COMMAND_TIMEOUT') {
            writeSSE({ error: true, code: 'COMMAND_TIMEOUT', message: 'Bridge timed out after 5 minutes' });
          } else {
            writeSSE({ error: true, code: 'BRIDGE_ERROR', message: result.error || 'Failed to get response from Claude' });
          }
          return;
        }

        const responseText = result.response;
        const modeUsed = 'bridge' as const;

        // 9. Estimate output tokens (CLI doesn't provide exact counts)
        const estimatedOutputTokens = Math.ceil(responseText.length / 4);

        // 10. Save assistant message to database
        let assistantMessageId = '';
        try {
          const assistantMsg = await addMessage(session.id, 'assistant', responseText, estimatedOutputTokens);
          assistantMessageId = assistantMsg.id;
        } catch (saveError) {
          console.error('[Johnny5] Failed to save assistant message:', saveError);
          assistantMessageId = `temp-${Date.now()}`;
        }

        // 10.5. Post-response: update living files with conversation summary
        if (isLivingFilesEnabled()) {
          try {
            const timestamp = new Date().toISOString().split('T')[0];
            const responseSummary = responseText.split('\n').filter((l: string) => l.trim()).slice(0, 3).join(' ').slice(0, 300);
            const memoryEntry = `\n### ${timestamp}\n- User: ${message.slice(0, 150)}${message.length > 150 ? '...' : ''}\n- Johnny5: ${responseSummary}${responseSummary.length >= 300 ? '...' : ''}\n`;
            if (userId !== 'default' && getActiveBridgeManager()?.hasBridgeForUser(userId)) {
              await getActiveBridgeManager().writeLivingFile(userId, 'MEMORY.md', memoryEntry, 'append');
            }
          } catch (err) {
            console.warn('[Johnny5] Failed to update MEMORY.md:', err);
          }
        }

        // 11. Update session statistics
        try {
          await updateSession(session.id, {
            message_count: history.length + 2,
            tokens_used: session.tokens_used + estimatedInputTokens + estimatedOutputTokens,
          });
        } catch (updateError) {
          console.error('[Johnny5] Failed to update session:', updateError);
        }

        // 11.5. Track usage for analytics
        try {
          await trackUsage({
            sessionId: session.id,
            source: 'direct',
            inputTokens: estimatedInputTokens,
            outputTokens: estimatedOutputTokens,
            model: 'claude-code-cli',
          });
        } catch (usageError) {
          console.error('[Johnny5] Failed to track usage:', usageError);
        }

        // 12. Log audit entry
        try {
          await logAudit('chat_interaction', {
            sessionId: session.id,
            inputTokens: estimatedInputTokens,
            outputTokens: estimatedOutputTokens,
            mode: modeUsed,
            memoryInjection: {
              enabled: enableMemoryInjection,
              memoriesUsed: memoriesUsed.length,
              searchType,
              totalTokens: totalMemoryTokens,
            },
          });
        } catch (auditError) {
          console.error('[Johnny5] Failed to log audit entry:', auditError);
        }

        // 12.6. Increment Johnny5 message counter for authenticated users
        if (userId !== 'default') {
          try {
            const newCount = await incrementJohnny5MessageCount(userId);
            console.log(`[Johnny5] Message count incremented for user ${userId}: ${newCount}`);
          } catch (counterError) {
            console.error('[Johnny5] Failed to increment message counter:', counterError);
          }
        }

        // 12.5. Check for skill opportunity
        let skillSuggestion: { patternId: string; patternDescription: string; count: number } | undefined;
        try {
          const { checkForSkillOpportunity } = await import('@/services/memory/pattern-detection-service');
          const opportunity = await checkForSkillOpportunity(message, userId);
          if (opportunity?.shouldSuggest) {
            skillSuggestion = {
              patternId: opportunity.patternId,
              patternDescription: opportunity.patternDescription,
              count: opportunity.count,
            };
            console.log(`[Johnny5] Skill suggestion: "${opportunity.patternDescription}" (${opportunity.count}x)`);
          }
        } catch (skillSuggestError) {
          console.warn('[Johnny5] Skill suggestion check failed:', skillSuggestError);
        }

        // 12.6. After-Chat Memory Intelligence (non-blocking)
        const capturedUserId = userId;
        setImmediate(async () => {
          try {
            if (containsSecret(message)) {
              console.log('[Johnny5] Skipping fact extraction - message contains secrets');
              return;
            }
            const fullHistory: MemoryConversationMessage[] = [
              ...history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
              { role: 'user' as const, content: message },
              { role: 'assistant' as const, content: responseText },
            ];
            const existingFacts = await getExistingFacts(session.id, 30, capturedUserId);
            const newFacts = await extractFactsFromConversation(fullHistory, existingFacts);
            if (newFacts.length > 0) {
              await saveFacts(session.id, newFacts, undefined, capturedUserId);
              console.log(`[Johnny5] After-chat extraction: saved ${newFacts.length} new facts`);
            }
            const messageCount = history.length + 2;
            if (messageCount > 0 && messageCount % 20 === 0) {
              console.log('[Johnny5] Running pattern detection cycle...');
              const patternResult = await runPatternDetectionCycle(capturedUserId);
              console.log('[Johnny5] Pattern cycle:', patternResult);
            }
            if (injectedPatternIds.length > 0) {
              for (const patternId of injectedPatternIds) {
                try {
                  await recordPatternApplication(patternId, capturedUserId);
                } catch { /* non-critical */ }
              }
              console.log(`[Johnny5] Reinforced ${injectedPatternIds.length} behavioral pattern(s)`);
            }
          } catch (extractionError) {
            console.error('[Johnny5] After-chat extraction error:', extractionError);
          }
        });

        // 13. Get updated quota for response
        let quotaInfo: ChatSuccessResponse['data']['quota'] = undefined;
        if (userId !== 'default') {
          const updatedQuota = await getJohnny5Quota(userId);
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

        // 14. Send done event with all metadata
        const modeInfo = { mode: 'bridge' as const, hasMCP: true, hasProjectContext: true, is24x7: false, provider: 'Claude Code CLI' };
        writeSSE({
          done: true,
          response: responseText,
          sessionId: session.id,
          messageId: assistantMessageId,
          tokensUsed: { input: estimatedInputTokens, output: estimatedOutputTokens },
          mode: modeInfo,
          memoryContext: enableMemoryInjection
            ? { enabled: true, memoriesUsed, searchType, totalMemoryTokens }
            : { enabled: false, memoriesUsed: [], searchType: 'none', totalMemoryTokens: 0 },
          memoryStatus,
          reasoningSteps: reasoningSteps.length > 1 ? reasoningSteps : undefined,
          quota: quotaInfo,
          skillSuggestion,
        });

      } catch (bgError) {
        console.error('[Johnny5] Background processing error:', bgError);
        writeSSE({ error: true, code: 'BRIDGE_ERROR', message: 'An unexpected error occurred' });
      } finally {
        writer.close().catch(() => {/* ignore */});
      }
    })();

    return new Response(readable as unknown as BodyInit, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Johnny5] Unexpected error in chat route:', error);
    return errorResponse('An unexpected error occurred', 'BRIDGE_ERROR', 500);
  }
}
