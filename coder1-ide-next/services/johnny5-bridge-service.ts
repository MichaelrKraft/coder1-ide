/**
 * Johnny5 Bridge Service
 *
 * Sends prompts to Claude Code CLI via the Bridge connection
 * instead of using the Anthropic API directly.
 *
 * This allows users with Claude Code Pro/Max plans to use their
 * included usage rather than paying separately for API calls.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { bridgeManager as _importedBridgeManager } from './bridge-manager';

// FIX: Always use global.bridgeManager set by server.js, which has actual WebSocket connections.
// Next.js webpack bundles API routes in separate chunks with their own module scope,
// so the module import may be a different BridgeManager instance with no registered connections.
// (Same fix already applied to /api/bridge/status/route.ts in Feb 2026)
function getActiveBridgeManager(): typeof _importedBridgeManager {
  return ((global as Record<string, unknown>).bridgeManager as typeof _importedBridgeManager) || _importedBridgeManager;
}
import {
  getPermissions,
  getProactivityLevel,
  Johnny5Permissions,
} from '@/lib/johnny5-config';
import { getProfile, UserProfile } from '@/lib/johnny5-db';

// ============================================================================
// MCP Discovery
// ============================================================================

/**
 * Read MCP servers from all known config locations and merge them.
 * Sources (in priority order):
 *   1. ~/.claude.json (Claude Code CLI — primary)
 *   2. ~/.mcp.json (Claude Desktop / VS Code)
 *   3. ~/manuslive/manuslive/config/mcporter.json (MCP Porter / Zapier integrations)
 * Returns deduplicated list of server names.
 */
export function getAvailableMcpTools(): string[] {
  const allServers = new Set<string>();

  // Source 1: Claude Code CLI config
  try {
    const content = readFileSync(join(homedir(), '.claude.json'), 'utf-8');
    const config = JSON.parse(content);
    for (const key of Object.keys(config.mcpServers || {})) {
      allServers.add(key);
    }
  } catch {
    // not present or malformed
  }

  // Source 2: Claude Desktop / VS Code config
  try {
    const content = readFileSync(join(homedir(), '.mcp.json'), 'utf-8');
    const config = JSON.parse(content);
    for (const key of Object.keys(config.mcpServers || {})) {
      allServers.add(key);
    }
  } catch {
    // not present or malformed
  }

  // Source 3: MCP Porter config (Zapier and other remote integrations)
  try {
    const mcporterPath = join(homedir(), 'manuslive', 'manuslive', 'config', 'mcporter.json');
    const content = readFileSync(mcporterPath, 'utf-8');
    const config = JSON.parse(content);
    for (const key of Object.keys(config.mcpServers || {})) {
      allServers.add(key);
    }
  } catch {
    // not present or malformed
  }

  return Array.from(allServers);
}

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SendPromptResult {
  success: boolean;
  response: string;
  error?: string;
  errorCode?: 'BRIDGE_NOT_CONNECTED' | 'BRIDGE_ERROR' | 'COMMAND_TIMEOUT';
  /** True when a session ID conflict was detected and retried — route should reset claude_session_uuid */
  sessionReset?: boolean;
}

// ============================================================================
// Johnny5 Bridge Service
// ============================================================================

export class Johnny5BridgeService {
  private userId: string;

  constructor(userId: string = 'default') {
    this.userId = userId;
  }

  /**
   * Build Johnny5's system prompt with current configuration
   * Includes user profile and preferences from database
   */
  private async buildSystemPrompt(): Promise<string> {
    console.warn('[Johnny5BridgeService] WARN: Using legacy buildSystemPrompt() fallback — living files NOT injected. Check generateJohnny5SystemPrompt() call in route.ts.');
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

    // Add dynamic MCP tool list from ~/.mcp.json
    const mcpTools = getAvailableMcpTools();
    if (mcpTools.length > 0) {
      capabilityLines.push(`- MCP tools available: ${mcpTools.join(', ')}`);
      capabilityLines.push('- You CAN and SHOULD use these tools proactively when relevant');
    }

    const capabilities =
      capabilityLines.length > 0
        ? capabilityLines.join('\n')
        : '- Basic chat assistance only';

    // Load user profile from database for persistent memory
    let userContext = '';
    try {
      const profile = await getProfile();
      if (profile) {
        const contextParts: string[] = [];

        // Add user roles
        if (profile.roles && profile.roles.length > 0) {
          contextParts.push(`User's roles: ${profile.roles.join(', ')}`);
        }

        // Add platforms they use
        if (profile.platforms && profile.platforms.length > 0) {
          contextParts.push(`Platforms they use: ${profile.platforms.join(', ')}`);
        }

        // Add their projects
        if (profile.projects && profile.projects.length > 0) {
          contextParts.push(`Projects: ${profile.projects.join(', ')}`);
        }

        // Add their goals
        if (profile.goals && profile.goals.length > 0) {
          contextParts.push(`Goals: ${profile.goals.join(', ')}`);
        }

        // Add personal preferences (like favorite color, etc.)
        if (profile.preferences && Object.keys(profile.preferences).length > 0) {
          const prefLines: string[] = [];
          for (const [key, value] of Object.entries(profile.preferences)) {
            // Format preference key nicely (favoriteColor -> favorite color)
            const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
            prefLines.push(`- ${formattedKey}: ${value}`);
          }
          if (prefLines.length > 0) {
            contextParts.push(`Personal preferences:\n${prefLines.join('\n')}`);
          }
        }

        if (contextParts.length > 0) {
          userContext = `\n## User Context (Remembered from past conversations)\n${contextParts.join('\n')}\n`;
        }
      }
    } catch (error) {
      console.error('[Johnny5BridgeService] Failed to load user profile:', error);
      // Continue without user context if database fails
    }

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
${userContext}
## Capabilities
${capabilities}

## Behavior Settings
Current proactivity level: ${proactivityLevel}
${proactivityLevel === 'low' ? '- Wait for explicit requests before suggesting actions' : ''}
${proactivityLevel === 'medium' ? "- Offer suggestions when relevant, but don't be pushy" : ''}
${proactivityLevel === 'high' ? '- Proactively suggest improvements and next steps' : ''}

## Memory
You have persistent memory across conversations. **CRITICAL: When you see a "## Relevant Memories"
section in the user's message, you MUST use that information to answer their question FIRST,
before considering any other context like git status or file changes.**

When the user asks about personal information they've shared before (like their favorite color,
name, preferences, goals, etc.), check the injected memories FIRST and respond based on that.
Only mention code/git status if the user explicitly asks about it.

## Guidelines
1. Keep responses concise but helpful
2. Offer to take action, not just give advice
3. When appropriate, break down tasks into steps
4. Ask clarifying questions if the request is ambiguous
5. Be honest about limitations
6. Always be helpful, accurate, and mindful of the user's time`;
  }

  /**
   * Build full prompt including system prompt and conversation history
   * 🔧 FIX (Feb 2026): Added size validation and truncation to prevent "Prompt too long" CLI errors
   */
  private async buildFullPrompt(
    message: string,
    history: ChatMessage[],
    skipHistory: boolean = false,
    overrideSystemPrompt?: string
  ): Promise<string> {
    const systemPrompt = overrideSystemPrompt ?? await this.buildSystemPrompt();

    // Format for Claude Code CLI
    let prompt = `[System Context]\n${systemPrompt}\n\n`;

    // Add conversation history.
    // Route.ts already applies a token-budget truncation (8000 tokens) before passing history here,
    // so we trust what we receive and include it all. The final MAX_PROMPT_SIZE check below
    // is the safety valve if the total prompt still exceeds the CLI limit.
    // When --session-id is active, Claude owns conversation state natively.
    // Skip text-encoding history to avoid doubling context in Claude's session file.
    if (!skipHistory && history.length > 0) {
      prompt += `[Conversation History]\n`;
      history.forEach((msg) => {
        const speaker = msg.role === 'user' ? 'User' : 'Johnny5';
        prompt += `${speaker}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `[Current Message]\nUser: ${message}\n\nJohnny5:`;

    // Final safety check: Claude CLI has a strict prompt size limit
    const MAX_PROMPT_SIZE = 50000; // ~12.5k tokens — Sonnet 4.6 handles 200k context, 50k is safe
    if (prompt.length > MAX_PROMPT_SIZE) {
      console.warn(`[Johnny5BridgeService] Prompt too long (${prompt.length} chars), truncating...`);
      // Keep system context and current message, truncate middle
      const systemEnd = prompt.indexOf('[Conversation History]');
      const currentStart = prompt.lastIndexOf('[Current Message]');

      if (systemEnd > 0 && currentStart > systemEnd) {
        const systemPart = prompt.slice(0, systemEnd);
        const currentPart = prompt.slice(currentStart);
        const available = MAX_PROMPT_SIZE - systemPart.length - currentPart.length - 100;

        if (available > 500) {
          const historyPart = prompt.slice(systemEnd, currentStart);
          const truncatedHistory = historyPart.slice(0, available) + '\n... [history truncated]\n\n';
          prompt = systemPart + truncatedHistory + currentPart;
        } else {
          // Not enough room for history, just use system + current
          prompt = systemPart + currentPart;
        }
      } else {
        // Fallback: just truncate from the end
        prompt = prompt.slice(0, MAX_PROMPT_SIZE - 50) + '\n... [truncated]\n\nJohnny5:';
      }
      console.log(`[Johnny5BridgeService] Truncated to ${prompt.length} chars`);
    }

    return prompt;
  }

  /**
   * Check if Bridge is connected
   */
  isBridgeConnected(): boolean {
    if (getActiveBridgeManager().hasBridgeForUser(this.userId)) {
      return true;
    }
    return !!getActiveBridgeManager().findAnyConnectedBridge();
  }

  /**
   * Send a prompt to Claude Code CLI via Bridge
   */
  async sendPrompt(
    message: string,
    conversationHistory: ChatMessage[] = [],
    onChunk?: (chunk: string) => void,
    claudeSessionId?: string,
    systemPrompt?: string
  ): Promise<SendPromptResult> {
    // 1. Check Bridge connection
    if (!this.isBridgeConnected()) {
      return {
        success: false,
        response: '',
        error: 'Bridge not connected. Please run coder1-bridge start in your terminal.',
        errorCode: 'BRIDGE_NOT_CONNECTED',
      };
    }

    // 2. Build the full prompt with system context and history.
    // Cap history at 4 messages (2 turns) — living files + memory search provide long-term context.
    // Each additional message adds ~500-2000 tokens to a prompt already ~7k tokens from living files.
    const MAX_BRIDGE_HISTORY = 4;
    const fullPrompt = await this.buildFullPrompt(
      message,
      conversationHistory.slice(-MAX_BRIDGE_HISTORY),
      false,
      systemPrompt
    );

    // 3. Execute via Bridge
    const commandId = `johnny5-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const result = await this.executeClaudeCommand(
        commandId,
        fullPrompt,
        { onChunk },
        claudeSessionId
      );

      // If Claude reports the session ID is already in use (stale from a previous bridge
      // crash), retry once without the session flag — this starts a fresh Claude session.
      if (!result.success && result.error && result.error.includes('already in use')) {
        console.warn('[Johnny5BridgeService] Session ID conflict detected, retrying without session ID...');
        const retryCommandId = `johnny5-retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const retryResult = await this.executeClaudeCommand(retryCommandId, fullPrompt, { onChunk }, undefined);
        return { ...retryResult, sessionReset: true };
      }

      return result;
    } catch (error) {
      console.error('[Johnny5BridgeService] Error executing command:', error);
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BRIDGE_ERROR',
      };
    }
  }

  /**
   * Execute Claude command via Bridge
   */
  private executeClaudeCommand(
    commandId: string,
    prompt: string,
    options?: { onChunk?: (chunk: string) => void },
    claudeSessionId?: string
  ): Promise<SendPromptResult> {
    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';
      let resolved = false;
      let lastAssistantLength = 0; // Tracks cumulative text length for stream-json delta computation

      // Timeout after 5 minutes (complex prompts with system context + history can take 2-5 min)
      const JOHNNY5_TIMEOUT = 300000; // 5 minutes
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          // Kill the running CLI process to prevent zombies
          try {
            getActiveBridgeManager().cancelCommand(commandId);
          } catch (e) {
            // Best effort - bridge may already be disconnected
          }
          resolve({
            success: false,
            response: '',
            error: 'Command timed out after 5 minutes',
            errorCode: 'COMMAND_TIMEOUT',
          });
        }
      }, JOHNNY5_TIMEOUT);

      // Cleanup function to remove listeners
      const cleanup = () => {
        clearTimeout(timeout);
        getActiveBridgeManager().off('command:output', outputHandler);
        getActiveBridgeManager().off('command:complete', completeHandler);
        getActiveBridgeManager().off('command:error', errorHandler);
        getActiveBridgeManager().off('command:cancelled', cancelledHandler);
        getActiveBridgeManager().off('command:timeout', timeoutHandler);
      };

      // Listen for output events — parse stream-json format for token-level streaming
      const outputHandler = (data: { commandId: string; data: string; stream: string }) => {
        if (data.commandId !== commandId) return;

        if (data.stream === 'stdout') {
          // stream-json outputs newline-delimited JSON events
          for (const line of data.data.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed) as Record<string, unknown>;

              // Assistant events carry the growing response text
              // With --include-partial-messages these arrive incrementally
              const msg = event.message as Record<string, unknown> | undefined;
              const content = msg?.content as Array<{ type: string; text?: string }> | undefined;
              if (event.type === 'assistant' && content?.[0]?.type === 'text' && typeof content[0].text === 'string') {
                const fullText = content[0].text;
                const delta = fullText.slice(lastAssistantLength);
                if (delta) {
                  output = fullText;
                  lastAssistantLength = fullText.length;
                  options?.onChunk?.(delta);
                }
              }

              // Result event is the authoritative final output
              if (event.type === 'result' && typeof event.result === 'string') {
                output = event.result;
              }
            } catch { /* non-JSON line (e.g. debug output) — ignore */ }
          }
        } else if (data.stream === 'stderr') {
          errorOutput += data.data;
        }
      };

      // Listen for completion
      const completeHandler = (data: { commandId: string; exitCode: number }) => {
        if (data.commandId === commandId && !resolved) {
          resolved = true;
          cleanup();

          if (data.exitCode === 0) {
            resolve({
              success: true,
              response: output.trim(),
            });
          } else {
            resolve({
              success: false,
              response: '',
              error: errorOutput || `Command failed with exit code ${data.exitCode}`,
              errorCode: 'BRIDGE_ERROR',
            });
          }
        }
      };

      // Listen for errors
      const errorHandler = (data: { commandId: string; error: string }) => {
        if (data.commandId === commandId && !resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: false,
            response: '',
            error: data.error,
            errorCode: 'BRIDGE_ERROR',
          });
        }
      };

      // Listen for cancellation (e.g., Bridge disconnect)
      const cancelledHandler = (data: { commandId: string; error: string }) => {
        if (data.commandId === commandId && !resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: false,
            response: '',
            error: data.error || 'Command was cancelled',
            errorCode: 'BRIDGE_NOT_CONNECTED',
          });
        }
      };

      // Listen for bridge-manager timeout (resolves immediately instead of hanging)
      const timeoutHandler = (data: { commandId: string; bridgeId: string }) => {
        if (data.commandId === commandId && !resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: false,
            response: '',
            error: 'Command timed out after 5 minutes',
            errorCode: 'COMMAND_TIMEOUT',
          });
        }
      };

      // Register listeners
      getActiveBridgeManager().on('command:output', outputHandler);
      getActiveBridgeManager().on('command:complete', completeHandler);
      getActiveBridgeManager().on('command:error', errorHandler);
      getActiveBridgeManager().on('command:cancelled', cancelledHandler);
      getActiveBridgeManager().on('command:timeout', timeoutHandler);

      // Build command WITHOUT the prompt — prompt delivered via stdin to avoid shell escaping issues
      const mcpEnabled = process.env.JOHNNY5_BRIDGE_MCP_ENABLED === 'true';
      const permissionFlag = mcpEnabled ? ' --permission-mode bypassPermissions' : '';
      const modelOverride = process.env.JOHNNY5_MODEL || 'claude-sonnet-4-5';
      // --session-id intentionally omitted: causes "Session ID already in use" conflicts when
      // the bridge reconnects after a disconnect (old Claude process holds the session file).
      // Conversation history is managed in our DB and passed via prompt text instead.
      const command = `claude --print --verbose --output-format stream-json --include-partial-messages --model ${modelOverride}${permissionFlag}`;

      console.log(`[Johnny5Bridge] MCP enabled: ${mcpEnabled}, command: ${command}, prompt via stdin (${prompt.length} chars)`);

      // Execute command via Bridge — prompt goes through stdinData, not shell argument
      getActiveBridgeManager().executeCommand(this.userId, {
        sessionId: 'johnny5-chat',
        commandId,
        command,
        stdinData: prompt,
        context: {
          workingDirectory: '/tmp',
        },
        timestamp: new Date(),
      }).then((result) => {
        if (!result.success && !resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: false,
            response: '',
            error: result.error || 'Failed to execute command',
            errorCode: 'BRIDGE_NOT_CONNECTED',
          });
        }
      });
    });
  }
}

// Export singleton instance for convenience
export const johnny5BridgeService = new Johnny5BridgeService();
