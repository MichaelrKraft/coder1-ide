/**
 * Terminal Token Integration Service (JavaScript version for server.js)
 * Monitors terminal commands and integrates with TokenTracker for automatic usage tracking
 */

const { EventEmitter } = require('events');

class TerminalTokenIntegration extends EventEmitter {
  constructor() {
    super();
    this.activeSessions = new Map();
    this.claudeCommandPatterns = [
      /^claude\s+/i,
      /^cld\s+/i,
      /^claude-code\s+/i,
      /^cc\s+/i,
    ];
    this.initialize();
  }

  initialize() {
    console.log('🎯 Terminal Token Integration initialized');
    
    // Clean up old sessions every 30 minutes
    setInterval(() => this.cleanupOldSessions(), 30 * 60 * 1000);
  }

  /**
   * Register a new terminal session for monitoring
   */
  registerSession(terminalId, sessionId) {
    this.activeSessions.set(terminalId, {
      id: terminalId,
      sessionId,
      lastActivity: Date.now(),
      commandBuffer: []
    });
    
    console.log(`🎯 Registered terminal session: ${terminalId} -> ${sessionId}`);
  }

  /**
   * Monitor terminal command input
   */
  async onCommandInput(terminalId, command) {
    const session = this.activeSessions.get(terminalId);
    if (!session) return;

    session.lastActivity = Date.now();
    
    // Check if this is a Claude command
    const isClaudeCommand = this.claudeCommandPatterns.some(pattern => 
      pattern.test(command.trim())
    );

    if (isClaudeCommand) {
      console.log(`🎯 Claude command detected: ${command.substring(0, 50)}...`);
      
      // Track the command via API
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
  async onTerminalOutput(terminalId, output) {
    const session = this.activeSessions.get(terminalId);
    if (!session) return;

    session.lastActivity = Date.now();

    // If we have pending Claude commands, consider this output a response
    if (session.commandBuffer.length > 0) {
      // Look for response completion indicators
      const isResponseComplete = this.isClaudeResponseComplete(output);
      
      if (isResponseComplete) {
        // Track the response via API
        await this.trackClaudeResponse(output, session.sessionId);
        
        // Clear one command from buffer (it was responded to)
        session.commandBuffer.shift();
      }
    }
  }

  /**
   * End a terminal session
   */
  async endSession(terminalId) {
    const session = this.activeSessions.get(terminalId);
    if (session) {
      // End session via API
      await this.endSessionViaAPI(session.sessionId);
      
      // Remove from active sessions
      this.activeSessions.delete(terminalId);
      
      console.log(`🎯 Ended terminal session: ${terminalId}`);
    }
  }

  /**
   * Track a Claude command execution via API
   */
  async trackClaudeCommand(command, sessionId) {
    try {
      const estimatedTokens = this.estimateCommandTokens(command);
      
      // Call the API endpoint to track the command
      const response = await fetch('http://localhost:3001/api/token-usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          sessionId,
          estimatedTokens
        })
      });
      
      if (response.ok) {
        console.log(`🎯 Tracked Claude command: ${estimatedTokens} tokens`);
        
        // Also track in project tracker
        try {
          const projectModule = require('./project-tracker');
          if (projectModule && projectModule.projectTracker) {
            await projectModule.projectTracker.trackCommand(command, sessionId, estimatedTokens);
          }
        } catch (err) {
          // Project tracker not available yet
        }
      }
    } catch (error) {
      console.error('Failed to track Claude command:', error.message);
    }
  }

  /**
   * Track a Claude response via API
   */
  async trackClaudeResponse(output, sessionId) {
    try {
      // Filter out control sequences and get clean response size
      const cleanOutput = this.cleanTerminalOutput(output);
      const responseSize = cleanOutput.length;
      
      // Call the API endpoint to track the response
      const response = await fetch('http://localhost:3001/api/token-usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'response',
          sessionId,
          responseSize
        })
      });
      
      if (response.ok) {
        console.log(`🎯 Tracked Claude response: ${responseSize} chars`);
      }
    } catch (error) {
      console.error('Failed to track Claude response:', error.message);
    }
  }

  /**
   * End session via API
   */
  async endSessionViaAPI(sessionId) {
    try {
      // No specific API for ending sessions in token-tracker, but we could add one
      // For now, just log the session end
      console.log(`🎯 Session ended: ${sessionId}`);
    } catch (error) {
      console.error('Failed to end session via API:', error.message);
    }
  }

  /**
   * Estimate tokens for a command
   */
  estimateCommandTokens(command) {
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
  isClaudeResponseComplete(output) {
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
  cleanTerminalOutput(output) {
    return output
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Remove ANSI escape sequences
      .replace(/[\r\n]+/g, '\n')             // Normalize line endings
      .trim();
  }

  /**
   * Clean up old inactive sessions
   */
  cleanupOldSessions() {
    const now = Date.now();
    const maxInactiveTime = 60 * 60 * 1000; // 1 hour
    
    for (const [terminalId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > maxInactiveTime) {
        console.log(`🎯 Cleaning up inactive session: ${terminalId}`);
        this.endSession(terminalId);
      }
    }
  }

  /**
   * Get current active sessions count
   */
  getActiveSessionsCount() {
    return this.activeSessions.size;
  }

  /**
   * Get session info for debugging
   */
  getSessionInfo(terminalId) {
    return this.activeSessions.get(terminalId);
  }
}

// Export singleton instance
const terminalTokenIntegration = new TerminalTokenIntegration();
module.exports = { terminalTokenIntegration };