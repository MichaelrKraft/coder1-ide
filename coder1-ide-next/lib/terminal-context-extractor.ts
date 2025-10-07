import { filterThinkingAnimations, extractClaudeCommands } from './checkpoint-utils';
import { logger } from './logger';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  commands: string[];
  totalLines: number;
  extractedLines: number;
}

export class TerminalContextExtractor {
  /**
   * Extract conversation context from xterm buffer
   * Reuses existing checkpoint filtering logic for consistency
   */
  static extractContext(
    xtermInstance: any,
    maxLines: number = 200
  ): ConversationContext {
    try {
      const buffer = xtermInstance.buffer.active;
      const lines: string[] = [];
      
      // Extract last N lines (same pattern as TerminalStatePersistence.tsx:274-285)
      const startLine = Math.max(0, buffer.length - maxLines);
      for (let i = startLine; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          lines.push(line.translateToString(true));
        }
      }
      
      logger.info(`📋 Extracted ${lines.length} lines from terminal buffer (total: ${buffer.length})`);
      
      // Join and filter (reuse checkpoint filtering)
      const rawHistory = lines.join('\n');
      const cleanHistory = filterThinkingAnimations(rawHistory);
      
      // Parse into conversation messages
      const messages = this.parseConversation(cleanHistory);
      
      // Extract commands
      const commandData = extractClaudeCommands(cleanHistory);
      const commands = commandData.map(c => c.command);
      
      logger.info(`💬 Parsed ${messages.length} conversation messages, ${commands.length} commands`);
      
      return {
        messages,
        commands,
        totalLines: buffer.length,
        extractedLines: lines.length
      };
    } catch (error) {
      logger.error('❌ Failed to extract terminal context:', error);
      return {
        messages: [],
        commands: [],
        totalLines: 0,
        extractedLines: 0
      };
    }
  }
  
  /**
   * Parse terminal output into conversation messages
   * Identifies user prompts vs Claude responses using heuristics
   */
  private static parseConversation(history: string): ConversationMessage[] {
    const messages: ConversationMessage[] = [];
    const lines = history.split('\n');
    
    let currentRole: 'user' | 'assistant' | null = null;
    let currentContent: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (trimmed.length === 0) {
        continue;
      }
      
      // Detect user input (lines starting with $ or > or claude command)
      if (trimmed.startsWith('$') || trimmed.startsWith('>') || trimmed.startsWith('claude ')) {
        // Save previous message if exists
        if (currentContent.length > 0 && currentRole) {
          messages.push({
            role: currentRole,
            content: currentContent.join('\n').trim(),
            timestamp: new Date()
          });
        }
        
        currentRole = 'user';
        currentContent = [trimmed.replace(/^[$>]\s*/, '')];
      }
      // Detect Claude CLI prompt continuation or responses
      else if (trimmed.length > 0) {
        // If we haven't set a role yet, assume assistant (response)
        if (!currentRole) {
          currentRole = 'assistant';
        }
        
        // If we were collecting user input and hit a response line, switch to assistant
        if (currentRole === 'user' && currentContent.length > 0 && !trimmed.startsWith('claude')) {
          messages.push({
            role: 'user',
            content: currentContent.join('\n').trim(),
            timestamp: new Date()
          });
          currentRole = 'assistant';
          currentContent = [trimmed];
        } else {
          currentContent.push(trimmed);
        }
      }
    }
    
    // Add final message
    if (currentContent.length > 0 && currentRole) {
      messages.push({
        role: currentRole,
        content: currentContent.join('\n').trim(),
        timestamp: new Date()
      });
    }
    
    // Filter out very short messages (likely noise)
    const filtered = messages.filter(m => m.content.length > 3);
    
    logger.debug(`🔍 Parsed conversation: ${messages.length} raw messages → ${filtered.length} filtered`);
    
    return filtered;
  }
  
  /**
   * Extract just the last N user-assistant exchanges
   * Useful for limiting context size
   */
  static extractRecentExchanges(
    xtermInstance: any,
    numExchanges: number = 5
  ): ConversationMessage[] {
    const context = this.extractContext(xtermInstance);
    
    // Get last N*2 messages (N user + N assistant)
    const recentMessages = context.messages.slice(-(numExchanges * 2));
    
    logger.info(`📋 Extracted ${recentMessages.length} recent messages (${numExchanges} exchanges)`);
    
    return recentMessages;
  }
  
  /**
   * Get context summary for display
   */
  static getContextSummary(context: ConversationContext): string {
    const userMessages = context.messages.filter(m => m.role === 'user').length;
    const assistantMessages = context.messages.filter(m => m.role === 'assistant').length;
    const totalChars = context.messages.reduce((sum, m) => sum + m.content.length, 0);
    
    return `${context.messages.length} messages (${userMessages} user, ${assistantMessages} assistant), ${totalChars} chars, ${context.commands.length} commands`;
  }
}
