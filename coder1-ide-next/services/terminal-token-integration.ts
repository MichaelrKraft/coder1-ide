/**
 * Terminal Token Integration Service
 * Monitors terminal commands and integrates with TokenTracker for automatic usage tracking
 */

import { EventEmitter } from 'events';
import { tokenTracker } from './token-tracker';
import { logger } from '@/lib/logger';

interface TerminalSession {
  id: string;
  sessionId: string;
  lastActivity: number;
  commandBuffer: string[];
}

export class TerminalTokenIntegration extends EventEmitter {
  private static instance: TerminalTokenIntegration;
  private activeSessions: Map<string, TerminalSession> = new Map();
  private claudeCommandPatterns = [
    /^claude\s+/i,
    /^cld\s+/i,
    /^claude-code\s+/i,
    /^cc\s+/i,
  ];

  private constructor() {
    super();
    this.initialize();
  }

  static getInstance(): TerminalTokenIntegration {
    if (!TerminalTokenIntegration.instance) {
      TerminalTokenIntegration.instance = new TerminalTokenIntegration();
    }
    return TerminalTokenIntegration.instance;
  }

  private initialize() {
    logger.info('Terminal Token Integration initialized');
    
    // Clean up old sessions every 30 minutes
    setInterval(() => this.cleanupOldSessions(), 30 * 60 * 1000);
  }

  /**
   * Register a new terminal session for monitoring
   */
  registerSession(terminalId: string, sessionId: string) {
    this.activeSessions.set(terminalId, {
      id: terminalId,
      sessionId,
      lastActivity: Date.now(),
      commandBuffer: []
    });
    
    logger.debug(`Registered terminal session: ${terminalId} -> ${sessionId}`);
  }

  /**
   * Monitor terminal command input
   */
  async onCommandInput(terminalId: string, command: string) {
    const session = this.activeSessions.get(terminalId);
    if (!session) return;

    session.lastActivity = Date.now();
    
    // Check if this is a Claude command
    const isClaudeCommand = this.claudeCommandPatterns.some(pattern => 
      pattern.test(command.trim())
    );

    if (isClaudeCommand) {
      logger.debug(`Claude command detected: ${command.substring(0, 50)}...`);
      
      // Track the command
      await this.trackClaudeCommand(command.trim(), session.sessionId);
      
      // Store in buffer for response tracking
      session.commandBuffer.push(command.trim());
      
      // Keep only last 5 commands to avoid memory issues
      if (session.commandBuffer.length > 5) {
        session.commandBuffer.shift();
      }
    }
  }

  /**
   * Monitor terminal output for Claude responses
   */
  async onTerminalOutput(terminalId: string, output: string) {
    const session = this.activeSessions.get(terminalId);
    if (!session) return;

    session.lastActivity = Date.now();

    // If we have pending Claude commands, consider this output a response
    if (session.commandBuffer.length > 0) {
      // Look for response completion indicators
      const isResponseComplete = this.isClaudeResponseComplete(output);
      
      if (isResponseComplete) {
        // Track the response
        await this.trackClaudeResponse(output, session.sessionId);
        
        // Clear one command from buffer (it was responded to)
        session.commandBuffer.shift();
      }
    }
  }

  /**
   * End a terminal session
   */
  async endSession(terminalId: string) {
    const session = this.activeSessions.get(terminalId);
    if (session) {
      // End the session in token tracker
      await tokenTracker.endSession(session.sessionId);
      
      // Remove from active sessions
      this.activeSessions.delete(terminalId);
      
      logger.debug(`Ended terminal session: ${terminalId}`);
    }
  }

  /**
   * Track a Claude command execution
   */
  private async trackClaudeCommand(command: string, sessionId: string) {
    try {
      // Estimate tokens based on command length and complexity
      const estimatedTokens = this.estimateCommandTokens(command);
      
      await tokenTracker.trackCommand(command, sessionId, estimatedTokens);
      
      this.emit('command-tracked', {
        command: command.substring(0, 100),
        sessionId,
        tokens: estimatedTokens
      });
      
      logger.debug(`Tracked Claude command: ${estimatedTokens} tokens`);
    } catch (error) {
      logger.error('Failed to track Claude command:', error);
    }
  }

  /**
   * Track a Claude response
   */
  private async trackClaudeResponse(output: string, sessionId: string) {
    try {
      // Filter out control sequences and get clean response size
      const cleanOutput = this.cleanTerminalOutput(output);
      const responseSize = cleanOutput.length;
      
      await tokenTracker.trackResponse(responseSize, sessionId);
      
      this.emit('response-tracked', {
        sessionId,
        responseSize,
        tokens: Math.ceil(responseSize / 4) // rough estimation
      });
      
      logger.debug(`Tracked Claude response: ${responseSize} chars`);
    } catch (error) {
      logger.error('Failed to track Claude response:', error);
    }
  }

  /**
   * Estimate tokens for a command
   */
  private estimateCommandTokens(command: string): number {
    const baseCommand = command.split(' ')[0];
    const content = command.substring(baseCommand.length).trim();
    
    // Base tokens for command type
    let tokens = 10;
    
    // Add tokens based on content length
    tokens += Math.ceil(content.length / 4);
    
    // Add complexity bonus for certain command types
    if (command.includes('write') || command.includes('create')) {
      tokens += 50; // Writing tasks typically use more tokens
    } else if (command.includes('explain') || command.includes('analyze')) {
      tokens += 30; // Analysis tasks
    } else if (command.includes('fix') || command.includes('debug')) {
      tokens += 40; // Debugging tasks
    }
    
    return Math.max(tokens, 20); // Minimum 20 tokens
  }

  /**
   * Check if Claude response is complete
   */
  private isClaudeResponseComplete(output: string): boolean {
    // Look for completion indicators
    const completionIndicators = [
      /^\$\s/m,                    // New shell prompt
      /^➜\s/m,                     // Zsh prompt
      /^.*@.*:\s/m,                // Generic bash prompt
      /Command completed/i,        // Explicit completion
      /Done\./i,                   // Done indicator
      /✅/,                        // Success indicator
      /❌/,                        // Error indicator
    ];
    
    return completionIndicators.some(pattern => pattern.test(output));
  }

  /**
   * Clean terminal output of control sequences
   */
  private cleanTerminalOutput(output: string): string {
    return output
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Remove ANSI escape sequences
      .replace(/[\r\n]+/g, '\n')             // Normalize line endings
      .trim();
  }

  /**
   * Clean up old inactive sessions
   */
  private cleanupOldSessions() {
    const now = Date.now();
    const maxInactiveTime = 60 * 60 * 1000; // 1 hour
    
    for (const [terminalId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > maxInactiveTime) {
        logger.debug(`Cleaning up inactive session: ${terminalId}`);
        this.endSession(terminalId);
      }
    }
  }

  /**
   * Get current active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get session info for debugging
   */
  getSessionInfo(terminalId: string) {
    return this.activeSessions.get(terminalId);
  }
}

// Export singleton instance
export const terminalTokenIntegration = TerminalTokenIntegration.getInstance();