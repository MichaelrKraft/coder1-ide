/**
 * Claude CLI Service for Terminal Integration
 * Replaces API-based Claude with direct Claude Code CLI integration
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface ClaudeCliMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ClaudeCliSession {
  id: string;
  projectPath?: string;
  conversationHistory: ClaudeCliMessage[];
  lastActivity: Date;
}

export interface ClaudeCliDetection {
  command: string;
  version: string;
  available: boolean;
  path?: string;
  authenticated: boolean;
  authError?: string;
}

class ClaudeCliService {
  private sessions: Map<string, ClaudeCliSession> = new Map();
  private detectedCommand: string | null = null;
  private isAvailable: boolean = false;

  // Possible Claude CLI command variations
  private readonly POSSIBLE_COMMANDS = [
    'claude',
    'claude-cli', 
    'claude-code',
    'anthropic',
    'claudish' // OpenRouter proxy for alternative models
  ];

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize service by detecting Claude CLI
   */
  private async initializeService() {
    try {
      const detection = await this.detectClaude();
      this.detectedCommand = detection.command;
      this.isAvailable = detection.available;
      
      if (this.isAvailable) {
        console.log(`✅ Claude CLI detected: ${this.detectedCommand} v${detection.version}`);
      } else {
        console.warn('⚠️ Claude CLI not found. Users will need to install Claude Code CLI');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize Claude CLI service:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Detect which Claude CLI command is available
   */
  async detectClaude(): Promise<ClaudeCliDetection> {
    for (const cmd of this.POSSIBLE_COMMANDS) {
      try {
        // Check if command exists
        const { stdout: which } = await execAsync(`which ${cmd}`);
        if (which.trim()) {
          // Get version
          const { stdout: versionOutput } = await execAsync(`${cmd} --version`);
          const version = this.parseVersion(versionOutput);

          // Check authentication status
          const authStatus = await this.checkAuthentication(cmd);

          return {
            command: cmd,
            version,
            available: true,
            path: which.trim(),
            authenticated: authStatus.authenticated,
            authError: authStatus.error
          };
        }
      } catch (error) {
        // Command not found, continue to next
        continue;
      }
    }

    return {
      command: '',
      version: '',
      available: false,
      authenticated: false,
      authError: 'Claude CLI not installed'
    };
  }

  /**
   * Check if Claude CLI is authenticated
   */
  private async checkAuthentication(command: string): Promise<{ authenticated: boolean; error?: string }> {
    try {
      const { stdout, stderr } = await execAsync(`${command} auth status`, { timeout: 10000 });
      // Check for authentication indicators in output
      const output = (stdout + stderr).toLowerCase();
      const isAuthenticated = output.includes('logged in') ||
                             output.includes('authenticated') ||
                             output.includes('valid') ||
                             (!output.includes('not logged in') && !output.includes('not authenticated'));
      return { authenticated: isAuthenticated };
    } catch (error) {
      // Auth check failed - user is not authenticated
      return { authenticated: false, error: 'Not authenticated - run: claude auth login' };
    }
  }

  /**
   * Parse version from command output
   */
  private parseVersion(versionOutput: string): string {
    // Extract version number from various formats
    const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : 'unknown';
  }

  /**
   * Check if Claude CLI is available
   */
  isClaudeAvailable(): boolean {
    return this.isAvailable && !!this.detectedCommand;
  }

  /**
   * Get detected Claude command
   */
  getClaudeCommand(): string | null {
    return this.detectedCommand;
  }

  /**
   * Create new conversation session
   */
  createSession(sessionId: string, projectPath?: string): ClaudeCliSession {
    const session: ClaudeCliSession = {
      id: sessionId,
      projectPath,
      conversationHistory: [],
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get existing session
   */
  getSession(sessionId: string): ClaudeCliSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get the effective command to use (claude or claudish based on settings)
   */
  private getEffectiveCommand(): string {
    // Check if Claudish mode is enabled via environment or localStorage
    const useClaudish = process.env.USE_CLAUDISH === 'true' || 
                       (typeof window !== 'undefined' && localStorage.getItem('use_claudish') === 'true');
    
    if (useClaudish && this.detectedCommand === 'claudish') {
      const selectedModel = process.env.CLAUDISH_MODEL || 
                           (typeof window !== 'undefined' && localStorage.getItem('claudish_model')) || 
                           'x-ai/grok-code-fast-1'; // Default to Grok Fast
      
      // Get OpenRouter API key from localStorage or environment
      const apiKey = (typeof window !== 'undefined' && localStorage.getItem('openrouter_api_key')) || 
                     process.env.OPENROUTER_API_KEY;
      
      // Set environment variable for Claudish to use
      if (apiKey && typeof process !== 'undefined') {
        process.env.OPENROUTER_API_KEY = apiKey;
      }
      
      return `claudish --model ${selectedModel}`;
    }
    
    return this.detectedCommand || 'claude';
  }

  /**
   * Send message to Claude CLI in interactive session
   */
  async sendMessage(
    sessionId: string, 
    message: string, 
    context?: string
  ): Promise<string> {
    if (!this.isClaudeAvailable()) {
      throw new Error('Claude CLI not available. Please install Claude Code CLI from https://claude.ai/code');
    }

    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Prepare the full message with context
    let fullMessage = message;
    if (context) {
      fullMessage = `Context:\n${context}\n\nUser: ${message}`;
    }

    try {
      // Execute Claude CLI command (with Claudish support)
      const effectiveCommand = this.getEffectiveCommand();
      const claudeCommand = `${effectiveCommand} chat "${fullMessage}"`;
      const workingDir = session.projectPath || process.cwd();
      
      const { stdout, stderr } = await execAsync(claudeCommand, {
        cwd: workingDir,
        timeout: 60000, // 60 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr) {
        console.warn('Claude CLI stderr:', stderr);
      }

      // Clean up the response
      const response = this.cleanClaudeResponse(stdout);

      // Update session history
      session.conversationHistory.push(
        { role: 'user', content: fullMessage, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      );
      session.lastActivity = new Date();

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Claude CLI error:', errorMessage);
      throw new Error(`Claude CLI error: ${errorMessage}`);
    }
  }

  /**
   * Send message with file attachments to Claude CLI
   */
  async sendMessageWithFiles(
    sessionId: string,
    message: string,
    filePaths: string[],
    context?: string
  ): Promise<{ response: string; command: string }> {
    if (!this.isClaudeAvailable()) {
      throw new Error('Claude CLI not available. Please install Claude Code CLI from https://claude.ai/code');
    }

    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Prepare message with file information
    // Claude CLI will use its Read tool to access these files
    const fileInfo = filePaths.map(p => `- ${p}`).join('\n');
    let fullMessage = `I've uploaded the following files for you to analyze:\n\n${fileInfo}\n\n${message}`;
    
    if (context) {
      fullMessage = `Context:\n${context}\n\n${fullMessage}`;
    }

    try {
      // Claude CLI command - just pass the message, Claude will read files using its tools (with Claudish support)
      const effectiveCommand = this.getEffectiveCommand();
      const claudeCommand = `${effectiveCommand} -p "${fullMessage}"`;
      const workingDir = session.projectPath || process.cwd();
      
      console.log(`🎯 Executing Claude CLI with file references:`, {
        command: this.detectedCommand,
        files: filePaths,
        message: message
      });
      
      const { stdout, stderr } = await execAsync(claudeCommand, {
        cwd: workingDir,
        timeout: 120000, // 120 second timeout for file processing
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for larger responses
      });

      if (stderr) {
        console.warn('Claude CLI stderr:', stderr);
      }

      // Clean up the response
      const response = this.cleanClaudeResponse(stdout);

      // Update session history with file info
      const fileNames = filePaths.map(p => path.basename(p)).join(', ');
      session.conversationHistory.push(
        { role: 'user', content: `[Files: ${fileNames}] ${message}`, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      );
      session.lastActivity = new Date();

      return { response, command: `claude (with files: ${fileNames}) "${message}"` };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Claude CLI error with files:', errorMessage);
      throw new Error(`Claude CLI error: ${errorMessage}`);
    }
  }

  /**
   * Clean up Claude CLI response
   */
  private cleanClaudeResponse(rawResponse: string): string {
    // Remove any CLI formatting or noise
    let cleaned = rawResponse.trim();
    
    // Remove common CLI prefixes
    cleaned = cleaned.replace(/^Claude:?\s*/gm, '');
    cleaned = cleaned.replace(/^Assistant:?\s*/gm, '');
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
  }

  /**
   * Process terminal commands that mention Claude
   */
  async processTerminalCommand(
    sessionId: string, 
    command: string, 
    workingDir?: string
  ): Promise<string> {
    // Extract Claude-specific commands
    const claudeCommands = [
      'claude help',
      'claude explain',
      'claude fix', 
      'claude optimize',
      'claude review',
      'claude suggest',
      'claude debug',
      'claude refactor'
    ];

    const isClaudeCommand = claudeCommands.some(cmd => 
      command.toLowerCase().startsWith(cmd)
    );

    if (!isClaudeCommand) {
      return '';
    }

    if (!this.isClaudeAvailable()) {
      return '❌ Claude CLI not available. Please install Claude Code CLI from https://claude.ai/code';
    }

    try {
      // Create session if it doesn't exist
      if (!this.getSession(sessionId)) {
        this.createSession(sessionId, workingDir);
      }

      // Get project context for better responses
      const context = await this.getProjectContext(workingDir);
      
      const response = await this.sendMessage(sessionId, command, context);
      return `🤖 Claude: ${response}`;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `❌ Claude Error: ${errorMessage}`;
    }
  }

  /**
   * Get project context for better Claude responses
   */
  private async getProjectContext(workingDir?: string): Promise<string> {
    if (!workingDir) return '';

    try {
      const contextParts: string[] = [];

      // Check for package.json
      try {
        const packagePath = path.join(workingDir, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        contextParts.push(`Project: ${packageJson.name || 'Unknown'}`);
        if (packageJson.description) {
          contextParts.push(`Description: ${packageJson.description}`);
        }
      } catch (error) {
        // No package.json, that's okay
      }

      // Check for README
      try {
        const readmePath = path.join(workingDir, 'README.md');
        const readmeContent = await fs.readFile(readmePath, 'utf-8');
        // Include first few lines of README
        const readmePreview = readmeContent.split('\n').slice(0, 5).join('\n');
        contextParts.push(`README preview:\n${readmePreview}`);
      } catch (error) {
        // No README, that's okay
      }

      contextParts.push(`Working directory: ${workingDir}`);
      
      return contextParts.join('\n');

    } catch (error) {
      return `Working directory: ${workingDir}`;
    }
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): ClaudeCliMessage[] {
    const session = this.getSession(sessionId);
    return session ? [...session.conversationHistory] : [];
  }

  /**
   * Clear conversation history for a session
   */
  clearHistory(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.conversationHistory = [];
      session.lastActivity = new Date();
    }
  }

  /**
   * Clean up old inactive sessions
   */
  cleanupSessions(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      available: this.isAvailable,
      command: this.detectedCommand,
      activeSessions: this.sessions.size,
      supportedCommands: [
        'claude help - Get help with Claude commands',
        'claude explain <topic> - Explain code or concepts', 
        'claude fix <error> - Debug and fix errors',
        'claude optimize <code> - Optimize code performance',
        'claude review <file> - Review code quality',
        'claude suggest <task> - Get implementation suggestions'
      ]
    };
  }
}

// Export singleton instance
export const claudeCliService = new ClaudeCliService();
export default claudeCliService;