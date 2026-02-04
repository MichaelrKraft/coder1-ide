/**
 * Johnny5 Bridge Service
 *
 * Sends prompts to Claude Code CLI via the Bridge connection
 * instead of using the Anthropic API directly.
 *
 * This allows users with Claude Code Pro/Max plans to use their
 * included usage rather than paying separately for API calls.
 */

import { bridgeManager } from './bridge-manager';
import {
  getPermissions,
  getProactivityLevel,
  Johnny5Permissions,
} from '@/lib/johnny5-config';
import { getProfile, UserProfile } from '@/lib/johnny5-db';

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
   */
  private async buildFullPrompt(
    message: string,
    history: ChatMessage[]
  ): Promise<string> {
    const systemPrompt = await this.buildSystemPrompt();

    // Format for Claude Code CLI
    let prompt = `[System Context]\n${systemPrompt}\n\n`;

    if (history.length > 0) {
      prompt += `[Conversation History]\n`;
      history.forEach((msg) => {
        const speaker = msg.role === 'user' ? 'User' : 'Johnny5';
        prompt += `${speaker}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `[Current Message]\nUser: ${message}\n\nJohnny5:`;

    return prompt;
  }

  /**
   * Check if Bridge is connected
   */
  isBridgeConnected(): boolean {
    if (bridgeManager.hasBridgeForUser(this.userId)) {
      return true;
    }
    return !!bridgeManager.findAnyConnectedBridge();
  }

  /**
   * Send a prompt to Claude Code CLI via Bridge
   */
  async sendPrompt(
    message: string,
    conversationHistory: ChatMessage[] = []
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

    // 2. Build the full prompt with system context and history
    const fullPrompt = await this.buildFullPrompt(message, conversationHistory);

    // 3. Execute via Bridge
    const commandId = `johnny5-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const result = await this.executeClaudeCommand(commandId, fullPrompt);
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
    prompt: string
  ): Promise<SendPromptResult> {
    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';
      let resolved = false;

      // Timeout after 120 seconds (matches Bridge default)
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: false,
            response: '',
            error: 'Command timed out after 120 seconds',
            errorCode: 'COMMAND_TIMEOUT',
          });
        }
      }, 120000);

      // Cleanup function to remove listeners
      const cleanup = () => {
        clearTimeout(timeout);
        bridgeManager.off('command:output', outputHandler);
        bridgeManager.off('command:complete', completeHandler);
        bridgeManager.off('command:error', errorHandler);
        bridgeManager.off('command:cancelled', cancelledHandler);
      };

      // Listen for output events
      const outputHandler = (data: { commandId: string; data: string; stream: string }) => {
        if (data.commandId === commandId) {
          if (data.stream === 'stdout') {
            output += data.data;
          } else if (data.stream === 'stderr') {
            errorOutput += data.data;
          }
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

      // Register listeners
      bridgeManager.on('command:output', outputHandler);
      bridgeManager.on('command:complete', completeHandler);
      bridgeManager.on('command:error', errorHandler);
      bridgeManager.on('command:cancelled', cancelledHandler);

      // Escape prompt for shell - use single quotes and escape any single quotes in the prompt
      const escapedPrompt = prompt.replace(/'/g, "'\\''");

      // Execute command via Bridge
      bridgeManager.executeCommand(this.userId, {
        sessionId: 'johnny5-chat',
        commandId,
        command: `claude '${escapedPrompt}'`,
        context: {
          workingDirectory: process.cwd(),
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
