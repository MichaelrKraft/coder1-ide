/**
 * Claude API Service for Terminal Integration
 * Handles all Claude Code API interactions
 */

import { useModelStore } from '@/stores/useModelStore';
import { useIDEStore } from '@/stores/useIDEStore';
import { logger } from '@/lib/logger';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

class ClaudeAPIService {
  private apiKey: string | null = null;
  private model: string = 'claude-sonnet-4-5-20250929';
  private baseURL: string = 'https://api.anthropic.com/v1';
  private conversationHistory: ClaudeMessage[] = [];

  constructor() {
    // Initialize with environment variables
    if (typeof window === 'undefined') {
      // Server-side
      this.apiKey = process.env.ANTHROPIC_API_KEY || null;
      this.model = process.env.CLAUDE_MODEL || this.model;
    }
  }

  /**
   * Set API key manually (for client-side usage)
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Set Claude model for API requests
   */
  setModel(model: string) {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Check if Claude API is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Send a message to Claude and get response
   */
  async sendMessage(message: string, context?: string): Promise<ClaudeResponse> {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    // Sync model from store before API call
    const currentModel = useModelStore.getState().selectedModel;
    if (currentModel && currentModel !== this.model) {
      logger.info(`📡 Syncing model from store: ${this.model} → ${currentModel}`);
      this.model = currentModel;
    }

    // Add context if provided (file contents, project structure, etc.)
    let fullMessage = message;
    if (context) {
      fullMessage = `Context:\n${context}\n\nUser: ${message}`;
    }

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: fullMessage });

    // Log API request with model info
    logger.debug(`🤖 Claude API Request: model=${this.model}, message_length=${message.length}`);

    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4000'),
          temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.1'),
          messages: this.conversationHistory,
          system: this.getSystemPrompt()
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const claudeResponse: ClaudeResponse = {
        content: data.content[0].text,
        usage: data.usage
      };

      // Add to conversation history
      this.conversationHistory.push({ 
        role: 'assistant', 
        content: claudeResponse.content 
      });

      // Log successful response with token usage
      if (claudeResponse.usage) {
        logger.debug(
          `✅ Claude API Response: ` +
          `input_tokens=${claudeResponse.usage.input_tokens}, ` +
          `output_tokens=${claudeResponse.usage.output_tokens}, ` +
          `model=${this.model}`
        );

        // Update token usage in store with REAL API data (not estimates)
        if (typeof window !== 'undefined') {
          const store = useIDEStore.getState();
          const currentUsage = store.aiState.tokenUsage;
          
          store.updateTokenUsage({
            input: currentUsage.input + claudeResponse.usage.input_tokens,
            output: currentUsage.output + claudeResponse.usage.output_tokens,
            total: currentUsage.total + claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens
          });
          
          logger.debug(
            `📊 Token Usage Updated: ` +
            `input=${currentUsage.input + claudeResponse.usage.input_tokens}, ` +
            `output=${currentUsage.output + claudeResponse.usage.output_tokens}`
          );
        }
      }

      return claudeResponse;

    } catch (error) {
      logger.error('Claude API error:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): ClaudeMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * System prompt for terminal integration
   */
  private getSystemPrompt(): string {
    return `You are Claude Code, an AI assistant integrated into a terminal environment. You help with:

1. Code analysis, debugging, and optimization
2. Terminal commands and system administration
3. Project structure and architecture advice
4. Code generation and refactoring
5. Explaining errors and suggesting fixes

Guidelines:
- Be concise but helpful
- Provide actionable advice
- Use terminal-friendly formatting
- Include relevant code examples
- Suggest specific commands when appropriate
- Be aware you're running in a web-based IDE terminal

Current project context: Next.js 14 + TypeScript + Tailwind CSS IDE application.`;
  }

  /**
   * Process terminal commands that mention Claude
   */
  async processTerminalCommand(command: string, workingDir?: string): Promise<string> {
    // Extract Claude-specific commands
    const claudeCommands = [
      'claude help',
      'claude explain',
      'claude fix',
      'claude optimize',
      'claude review',
      'claude suggest'
    ];

    const isClaudeCommand = claudeCommands.some(cmd => 
      command.toLowerCase().startsWith(cmd)
    );

    if (!isClaudeCommand) {
      return '';
    }

    try {
      // Get project context
      const context = workingDir ? 
        `Working directory: ${workingDir}\nCommand: ${command}` : 
        `Command: ${command}`;

      const response = await this.sendMessage(command, context);
      return response.content;

    } catch (error) {
      return `❌ Claude Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

// Export singleton instance
export const claudeAPI = new ClaudeAPIService();
export default claudeAPI;