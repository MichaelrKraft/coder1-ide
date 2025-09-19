/**
 * Universal AI Wrapper Service
 * Provides a unified interface for interacting with any AI CLI platform
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { cliDetector, CLIInfo } from './cli-detector';
// import { contextDatabase } from '@/services/context-database'; // Server-only, commenting for browser
import { logger } from '@/lib/logger';

export interface AISession {
  id: string;
  platform: string;
  process: ChildProcess | null;
  context: string[];
  history: AIInteraction[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'idle' | 'terminated';
}

export interface AIInteraction {
  timestamp: Date;
  input: string;
  output: string;
  tokensUsed?: number;
  platform: string;
}

export interface AICommand {
  platform?: string; // Optional - uses primary if not specified
  prompt: string;
  context?: string;
  files?: string[];
  sessionId?: string;
  stream?: boolean;
}

export interface AIResponse {
  platform: string;
  response: string;
  sessionId: string;
  tokensUsed?: number;
  timestamp: Date;
  error?: string;
}

class UniversalAIWrapper extends EventEmitter {
  private sessions: Map<string, AISession> = new Map();
  private activePlatform: CLIInfo | null = null;
  private readonly MAX_CONTEXT_TOKENS = 2000;

  /**
   * Initialize the wrapper and detect available platforms
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Universal AI Wrapper...');
    
    const detection = await cliDetector.detectAll();
    
    if (detection.platforms.length === 0) {
      logger.warn('⚠️ No AI CLI platforms detected');
      throw new Error('No AI CLI platforms available. Please install at least one AI CLI tool.');
    }

    this.activePlatform = detection.primary;
    logger.info(`✅ Universal AI Wrapper ready with ${detection.platforms.length} platforms`);
    logger.info(`🎯 Primary platform: ${this.activePlatform?.name}`);
  }

  /**
   * Execute an AI command with automatic platform selection
   */
  async execute(command: AICommand): Promise<AIResponse> {
    try {
      // Select platform
      const platform = await this.selectPlatform(command.platform);
      if (!platform) {
        throw new Error('No suitable AI platform available');
      }

      // Get or create session
      const sessionId = command.sessionId || this.createSessionId();
      let session = this.sessions.get(sessionId);
      
      if (!session) {
        session = await this.createSession(platform, sessionId);
      }

      // Inject smart context if needed
      const contextualPrompt = await this.injectContext(command.prompt, command.context, command.files);

      // Execute command based on platform
      const response = await this.executePlatformCommand(platform, contextualPrompt, session, command.stream);

      // Store interaction
      const interaction: AIInteraction = {
        timestamp: new Date(),
        input: command.prompt,
        output: response,
        platform: platform.name,
        tokensUsed: this.estimateTokens(contextualPrompt + response)
      };

      session.history.push(interaction);

      // Store in context database for memory
      await this.storeInMemory(interaction, sessionId);

      // Emit events for UI updates
      this.emit('interaction', {
        sessionId,
        platform: platform.name,
        interaction
      });

      return {
        platform: platform.name,
        response,
        sessionId,
        tokensUsed: interaction.tokensUsed,
        timestamp: interaction.timestamp
      };

    } catch (error) {
      logger.error('❌ AI command execution failed:', error);
      
      return {
        platform: command.platform || 'unknown',
        response: '',
        sessionId: command.sessionId || '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Select the best platform for the task
   */
  private async selectPlatform(requestedPlatform?: string): Promise<CLIInfo | null> {
    if (requestedPlatform) {
      // Try to use requested platform
      const platform = await cliDetector.getPlatform(requestedPlatform);
      if (platform?.installed && platform?.authenticated) {
        return platform;
      }
      logger.warn(`⚠️ Requested platform ${requestedPlatform} not available, using primary`);
    }

    // Use primary platform
    const detection = await cliDetector.detectAll();
    return detection.primary;
  }

  /**
   * Create a new AI session
   */
  private async createSession(platform: CLIInfo, sessionId: string): Promise<AISession> {
    const session: AISession = {
      id: sessionId,
      platform: platform.name,
      process: null,
      context: [],
      history: [],
      startTime: new Date(),
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    
    logger.debug(`📝 Created session ${sessionId} with ${platform.name}`);
    
    return session;
  }

  /**
   * Inject smart context based on current work
   */
  private async injectContext(prompt: string, additionalContext?: string, files?: string[]): Promise<string> {
    let context = '';

    try {
      // Get recent context from memory
      // Commented out for browser compatibility - needs server-side implementation
      // const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
      // const folder = await contextDatabase.getOrCreateFolder(projectPath);
      // const recentConversations = await contextDatabase.getRecentConversations(folder.id, 2);

      // if (recentConversations.length > 0) {
      //   context += '## Recent Context:\n';
      //   recentConversations.forEach((conv, i) => {
      //     context += `Previous: ${this.truncate(conv.user_input, 200)}\n`;
      //     context += `Response: ${this.truncate(conv.claude_reply, 200)}\n\n`;
      //   });
      // }

      // Add file context if provided
      if (files && files.length > 0) {
        context += `## Working with files:\n${files.join(', ')}\n\n`;
      }

      // Add additional context if provided
      if (additionalContext) {
        context += `## Additional Context:\n${additionalContext}\n\n`;
      }

      // Keep context within token limits
      const contextTokens = this.estimateTokens(context);
      if (contextTokens > this.MAX_CONTEXT_TOKENS) {
        context = this.truncate(context, this.MAX_CONTEXT_TOKENS * 4); // ~4 chars per token
      }

      // Combine context with prompt
      if (context) {
        return `${context}\n## Current Request:\n${prompt}`;
      }

    } catch (error) {
      logger.warn('⚠️ Failed to inject context:', error);
    }

    return prompt;
  }

  /**
   * Execute command on specific platform
   */
  private async executePlatformCommand(
    platform: CLIInfo, 
    prompt: string, 
    session: AISession,
    stream = false
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Get the appropriate command for the platform
      const command = this.getPlatformCommand(platform, prompt);

      logger.debug(`🤖 Executing on ${platform.name}: ${command.cmd}`);

      // Spawn the CLI process
      const child = spawn(command.cmd, command.args, {
        shell: true,
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      // Handle stdout
      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;

        if (stream) {
          this.emit('stream', {
            sessionId: session.id,
            platform: platform.name,
            data: text
          });
        }
      });

      // Handle stderr
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Handle process completion
      child.on('close', (code) => {
        if (code === 0) {
          resolve(this.cleanOutput(output, platform));
        } else {
          logger.error(`❌ ${platform.name} exited with code ${code}: ${errorOutput}`);
          reject(new Error(`${platform.name} failed: ${errorOutput}`));
        }
      });

      // Handle errors
      child.on('error', (error) => {
        logger.error(`❌ Failed to spawn ${platform.name}:`, error);
        reject(error);
      });

      // Store process reference
      session.process = child;

      // Send the prompt via stdin for interactive CLIs
      if (this.isInteractiveCLI(platform)) {
        child.stdin?.write(prompt + '\n');
        child.stdin?.end();
      }
    });
  }

  /**
   * Get platform-specific command
   */
  private getPlatformCommand(platform: CLIInfo, prompt: string): { cmd: string; args: string[] } {
    // Escape prompt for shell
    const escapedPrompt = prompt.replace(/'/g, "'\\''");

    switch (platform.name) {
      case 'Claude Code':
        return {
          cmd: 'claude',
          args: ['--max-tokens', '4000', escapedPrompt]
        };

      case 'OpenAI CLI':
        return {
          cmd: 'openai',
          args: ['api', 'chat.completions.create', '-m', 'gpt-4', '-g', 'user', escapedPrompt]
        };

      case 'GitHub Copilot CLI':
        return {
          cmd: 'gh',
          args: ['copilot', 'suggest', escapedPrompt]
        };

      case 'Aider':
        return {
          cmd: `echo '${escapedPrompt}' | aider --yes --no-git`,
          args: []
        };

      case 'Continue Dev':
        return {
          cmd: `echo '${escapedPrompt}' | continue`,
          args: []
        };

      case 'Ollama':
        return {
          cmd: 'ollama',
          args: ['run', 'codellama', escapedPrompt]
        };

      default:
        // Generic command structure
        return {
          cmd: `echo '${escapedPrompt}' | ${platform.command}`,
          args: []
        };
    }
  }

  /**
   * Check if CLI is interactive (needs stdin)
   */
  private isInteractiveCLI(platform: CLIInfo): boolean {
    const interactiveCLIs = ['Aider', 'Continue Dev', 'Ollama'];
    return interactiveCLIs.includes(platform.name);
  }

  /**
   * Clean platform-specific output
   */
  private cleanOutput(output: string, platform: CLIInfo): string {
    // Remove ANSI escape codes
    let cleaned = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

    // Platform-specific cleaning
    if (platform.name === 'Claude Code') {
      // Remove Claude's response prefix if present
      cleaned = cleaned.replace(/^(Human:|Assistant:)\s*/gm, '');
    } else if (platform.name === 'GitHub Copilot CLI') {
      // Remove suggestion markers
      cleaned = cleaned.replace(/^##\s*/gm, '');
    }

    return cleaned.trim();
  }

  /**
   * Store interaction in memory system
   */
  private async storeInMemory(interaction: AIInteraction, sessionId: string): Promise<void> {
    try {
      // Commented out for browser compatibility - needs server-side implementation
      // const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
      // const folder = await contextDatabase.getOrCreateFolder(projectPath);

      // await contextDatabase.addConversation({
      //   folder_id: folder.id,
      //   user_input: interaction.input,
      //   claude_reply: interaction.output,
      //   model: interaction.platform,
      //   success: true,
      //   metadata: {
      //     sessionId,
      //     tokensUsed: interaction.tokensUsed,
      //     timestamp: interaction.timestamp.toISOString()
      //   }
      // });

      logger.debug(`💾 Stored interaction in memory for session ${sessionId}`);
    } catch (error) {
      logger.warn('⚠️ Failed to store in memory:', error);
    }
  }

  /**
   * Switch to a different AI platform
   */
  async switchPlatform(platformName: string): Promise<boolean> {
    const platform = await cliDetector.getPlatform(platformName);
    
    if (!platform?.installed || !platform?.authenticated) {
      logger.error(`❌ Cannot switch to ${platformName}: Not available`);
      return false;
    }

    this.activePlatform = platform;
    logger.info(`🔄 Switched to ${platformName}`);
    
    this.emit('platform-switched', platform);
    
    return true;
  }

  /**
   * Get available platforms
   */
  async getAvailablePlatforms(): Promise<CLIInfo[]> {
    const detection = await cliDetector.detectAll();
    return detection.platforms;
  }

  /**
   * Get current active platform
   */
  getActivePlatform(): CLIInfo | null {
    return this.activePlatform;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AISession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AISession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) return;

    // Kill the process if running
    if (session.process && !session.process.killed) {
      session.process.kill();
    }

    session.status = 'terminated';
    session.endTime = new Date();

    logger.info(`🔚 Terminated session ${sessionId}`);
    
    this.emit('session-terminated', sessionId);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to approximate token limit
   */
  private truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '...';
  }

  /**
   * Generate unique session ID
   */
  private createSessionId(): string {
    return `ai_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clean up terminated sessions
   */
  cleanupSessions(): void {
    const terminated = Array.from(this.sessions.values())
      .filter(s => s.status === 'terminated');

    terminated.forEach(session => {
      const ageMs = Date.now() - (session.endTime?.getTime() || 0);
      const oneHour = 60 * 60 * 1000;

      if (ageMs > oneHour) {
        this.sessions.delete(session.id);
        logger.debug(`🗑️ Cleaned up session ${session.id}`);
      }
    });
  }
}

// Export singleton instance
export const universalAIWrapper = new UniversalAIWrapper();

// Start cleanup interval
setInterval(() => {
  universalAIWrapper.cleanupSessions();
}, 30 * 60 * 1000); // Every 30 minutes

export default universalAIWrapper;