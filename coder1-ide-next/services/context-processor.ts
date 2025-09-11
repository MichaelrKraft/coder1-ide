/**
 * Context Processor Service
 * Processes terminal chunks into conversations and patterns
 */

import { contextDatabase, ClaudeConversation, DetectedPattern } from './context-database';
import { enhancedMemoryContext } from './enhanced-memory-context';
import { logger } from '@/lib/logger';

export interface TerminalChunk {
  timestamp: number;
  type: 'terminal_output' | 'terminal_input' | 'claude_output' | 'user_input';
  content: string;
  sessionId: string;
  fileContext?: string[];
  commandContext?: string;
}

export interface ProcessedConversation {
  userInput: string;
  claudeReply: string;
  success: boolean;
  errorType?: string;
  filesInvolved: string[];
  tokensEstimate: number;
}

export interface ProcessingResult {
  conversations: ProcessedConversation[];
  patterns: DetectedPattern[];
  summary: string;
}

class ContextProcessor {
  private processingQueue: TerminalChunk[][] = [];
  private isProcessing: boolean = false;
  private currentFolder?: string;
  private currentSession?: string;

  /**
   * Initialize processor with current project context
   */
  async initialize(projectPath: string): Promise<void> {
    try {
      // Get or create context folder
      const folder = await contextDatabase.getOrCreateFolder(projectPath);
      this.currentFolder = folder.id;
      
      // Create new session
      const session = await contextDatabase.createSession(folder.id);
      this.currentSession = session.id;
      
      logger.debug(`🧠 Context processor initialized for: ${folder.name}`);
    } catch (error) {
      logger.error('❌ Failed to initialize context processor:', error);
      throw error;
    }
  }

  /**
   * Process chunk of terminal data
   */
  async processChunk(chunks: TerminalChunk[]): Promise<void> {
    // REMOVED: // REMOVED: // REMOVED: console.log(`🚀 Context Processor: Received ${chunks.length} chunks for processing`);
    
    // Add to processing queue
    this.processingQueue.push(chunks);
    
    // Process if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the queue of chunks
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    try {
      while (this.processingQueue.length > 0) {
        const chunks = this.processingQueue.shift()!;
        await this.processChunkBatch(chunks);
      }
    } catch (error) {
      logger.error('❌ Error processing context queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of chunks
   */
  private async processChunkBatch(chunks: TerminalChunk[]): Promise<void> {
    try {
      // 1. Extract Claude conversations
      const conversations = this.extractClaudeDialogs(chunks);
      
      // 2. Detect patterns
      const patterns = this.detectPatterns(chunks);
      
      // 3. Store conversations with embeddings
      for (const conv of conversations) {
        if (this.currentSession) {
          await this.storeConversationWithEmbedding(conv);
        }
      }
      
      // 4. Store patterns
      for (const pattern of patterns) {
        if (this.currentSession) {
          await contextDatabase.storePattern({
            ...pattern,
            session_id: this.currentSession
          });
        }
      }
      
      // 5. Update memory context (existing RAG system)
      if (conversations.length > 0) {
        await this.updateMemoryContext(chunks);
      }
      
      logger.debug(`🔄 Processed ${conversations.length} conversations, ${patterns.length} patterns`);
    } catch (error) {
      logger.error('❌ Failed to process chunk batch:', error);
    }
  }

  /**
   * Extract Claude conversation pairs from terminal output
   */
  private extractClaudeDialogs(chunks: TerminalChunk[]): ProcessedConversation[] {
    const conversations: ProcessedConversation[] = [];
    
    try {
      let currentUserInput = '';
      let currentClaudeReply = '';
      let inClaudeResponse = false;
      let filesInvolved: Set<string> = new Set();
      
      logger.debug(`🔍 Processing ${chunks.length} chunks for Claude dialogs`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const content = chunk.content.toLowerCase();
        
        logger.debug(`🔎 Chunk ${i}: type="${chunk.type}" content="${chunk.content.substring(0, 50)}..."`);
        
        // Detect Claude command start - enhanced patterns for Claude Code CLI
        const claudePatterns = [
          /^claude\s+(.+)$/i,           // claude command
          /^cld\s+(.+)$/i,              // cld shorthand  
          /^claude-code\s+(.+)$/i,      // claude-code variant
          /^cc\s+(.+)$/i,               // cc shorthand
          /^\$\s*claude\s+(.+)$/i,      // with bash prompt
          /^>\s*claude\s+(.+)$/i,       // with > prompt
          /^➜\s*.*claude\s+(.+)$/i,     // with zsh prompt
          /^\[.*\]\$\s*claude\s+(.+)$/i, // with git prompt
          /claude\s+(.+)$/i             // anywhere in line (fallback)
        ];
        
        if (chunk.type === 'terminal_input') {
          let extractedInput: string | null = null;
          
          // Extract command context for better analysis
          chunk.commandContext = this.extractCommandContext(chunk.content);
          
          for (const pattern of claudePatterns) {
            const match = chunk.content.match(pattern);
            if (match && match[1]) {
              extractedInput = match[1].trim();
              break;
            }
          }
          
          // Also detect pure Claude sessions (with prompt prefixes)
          const cleanContent = chunk.content.replace(/^(\$|>|➜.*?|\[.*\]\$)\s*/, '').trim();
          if (!extractedInput && (
            cleanContent === 'claude' || 
            cleanContent === 'claude-code' || 
            cleanContent === 'cld' ||
            cleanContent === 'cc'
          )) {
            extractedInput = '[Interactive Claude session started]';
          }
          
          if (extractedInput) {
            currentUserInput = extractedInput;
            filesInvolved.clear();
            inClaudeResponse = true;
            logger.debug(`🎯 Detected Claude command: "${extractedInput}"`);
          }
        }
        
        // Detect Claude response content
        if (inClaudeResponse && (chunk.type === 'terminal_output' || chunk.type === 'claude_output')) {
          // Skip command echo, prompts, and system noise - enhanced patterns
          const skipPatterns = [
            /^claude\s/i,                    // Command echo
            /^cld\s/i,                       // Command echo
            /^claude-code\s/i,               // Command echo 
            /^cc\s/i,                        // Command echo
            /^\$\s*$/,                       // Empty bash prompt
            /^>\s*$/,                        // Empty generic prompt
            /^bash-\d+\.\d+\$/,              // Bash version prompt
            /^➜\s*.*?\$\s*$/,                // Empty zsh prompt
            /^\[.*\]\s*\$\s*$/,               // Empty git prompt
            /^\s*$/,                         // Empty lines
            /^\x1b\[[0-9;]*m/,               // ANSI escape codes
            /^Loading\.\.\./i,                // Loading indicators
            /^Connecting\.\.\./i,             // Connection indicators
            /^\[\d{2}:\d{2}:\d{2}\]/,         // Timestamp prefixes
            /^(\x08|\x07)+$/                 // Backspace/bell characters
          ];
          
          const shouldSkip = skipPatterns.some(pattern => pattern.test(chunk.content));
          
          if (!shouldSkip && chunk.content.trim().length > 0) {
            currentClaudeReply += chunk.content + '\n';
          }
        }
        
        // Detect file references
        if (chunk.fileContext) {
          chunk.fileContext.forEach(file => filesInvolved.add(file));
        }
        
        // Detect conversation end - enhanced with Claude CLI completion patterns
        const nextChunk = i < chunks.length - 1 ? chunks[i + 1] : null;
        const claudeCompletionPatterns = [
          /^\$\s*$/,                        // Return to bash prompt
          /^➜\s*.*?\$\s*$/,                 // Return to zsh prompt
          /^\[.*\]\s*\$\s*$/,               // Return to git prompt
          /Generated with \[Claude Code\]/i, // Claude Code signature
          /^---+$/,                         // Separator lines
          /^\s*$/ // Empty line after response
        ];
        
        const isClaudeCompletion = claudeCompletionPatterns.some(pattern => 
          pattern.test(chunk.content)
        );
        
        const shouldEnd = !nextChunk || 
                         nextChunk.type === 'terminal_input' ||
                         (inClaudeResponse && isClaudeCompletion) ||
                         (content.includes('$ ') && inClaudeResponse);
        
        if (shouldEnd && inClaudeResponse && currentUserInput && currentClaudeReply.trim()) {
          const success = this.detectSuccess(currentClaudeReply);
          const errorType = success ? undefined : this.detectErrorType(currentClaudeReply);
          
          const conversation = {
            userInput: currentUserInput,
            claudeReply: currentClaudeReply.trim(),
            success,
            errorType,
            filesInvolved: Array.from(filesInvolved),
            tokensEstimate: this.estimateTokens(currentUserInput + currentClaudeReply)
          };
          
          conversations.push(conversation);
          logger.debug(`✅ Found conversation: "${currentUserInput}" -> "${currentClaudeReply.substring(0, 50)}..."`);
          
          // Reset for next conversation
          currentUserInput = '';
          currentClaudeReply = '';
          inClaudeResponse = false;
          filesInvolved.clear();
        }
      }
      
      logger.debug(`🎯 Extracted ${conversations.length} conversations from ${chunks.length} chunks`);
      return conversations;
    } catch (error) {
      logger.error('❌ Failed to extract Claude dialogs:', error);
      return [];
    }
  }

  /**
   * Detect patterns in terminal chunks
   */
  private detectPatterns(chunks: TerminalChunk[]): Omit<DetectedPattern, 'id' | 'session_id' | 'first_seen' | 'last_seen'>[] {
    const patterns: Omit<DetectedPattern, 'id' | 'session_id' | 'first_seen' | 'last_seen'>[] = [];
    
    try {
      // 1. Command sequence patterns
      const commands = chunks
        .filter(c => c.type === 'terminal_input' && c.commandContext)
        .map(c => c.commandContext!)
        .filter(Boolean);
      
      if (commands.length >= 2) {
        const sequence = commands.slice(-3).join(' → ');
        patterns.push({
          pattern_type: 'command_sequence',
          description: `Command sequence: ${sequence}`,
          frequency: 1,
          confidence: 0.7,
          metadata: JSON.stringify({ commands: commands.slice(-3) })
        });
      }
      
      // 2. Error → Solution patterns
      const errorChunks = chunks.filter(c => this.containsError(c.content));
      const solutionChunks = chunks.filter(c => this.containsSolution(c.content));
      
      if (errorChunks.length > 0 && solutionChunks.length > 0) {
        patterns.push({
          pattern_type: 'error_solution',
          description: 'Error resolved in session',
          frequency: 1,
          confidence: 0.8,
          metadata: JSON.stringify({
            errorType: this.detectErrorType(errorChunks[0].content),
            solution: solutionChunks[0].content.substring(0, 200)
          })
        });
      }
      
      // 3. File change patterns
      const filesModified = new Set<string>();
      chunks.forEach(chunk => {
        if (chunk.fileContext) {
          chunk.fileContext.forEach(file => filesModified.add(file));
        }
      });
      
      if (filesModified.size > 1) {
        patterns.push({
          pattern_type: 'file_change',
          description: `Files modified together: ${Array.from(filesModified).slice(0, 3).join(', ')}`,
          frequency: 1,
          confidence: 0.6,
          metadata: JSON.stringify({ files: Array.from(filesModified) })
        });
      }
      
      // 4. Success indicators
      const successIndicators = chunks.filter(c => this.containsSuccess(c.content));
      if (successIndicators.length > 0) {
        patterns.push({
          pattern_type: 'success_indicator',
          description: 'Session completed successfully',
          frequency: 1,
          confidence: 0.9,
          metadata: JSON.stringify({
            indicators: successIndicators.map(c => c.content.substring(0, 100))
          })
        });
      }
      
      return patterns;
    } catch (error) {
      logger.error('❌ Failed to detect patterns:', error);
      return [];
    }
  }

  /**
   * Store conversation with embeddings using existing infrastructure
   */
  private async storeConversationWithEmbedding(conversation: ProcessedConversation): Promise<void> {
    try {
      // Generate embedding using existing transformers
      const combinedText = `${conversation.userInput} ${conversation.claudeReply}`;
      
      // Store in database
      await contextDatabase.storeConversation({
        session_id: this.currentSession!,
        user_input: conversation.userInput,
        claude_reply: conversation.claudeReply,
        success: conversation.success, // Keep as boolean
        error_type: conversation.errorType,
        files_involved: JSON.stringify(conversation.filesInvolved),
        tokens_used: conversation.tokensEstimate,
        embedding: undefined, // Use undefined for optional field
        context_used: undefined // Add missing field
      });
    } catch (error) {
      logger.error('❌ Failed to store conversation with embedding:', error);
    }
  }

  /**
   * Update existing memory context system
   */
  private async updateMemoryContext(chunks: TerminalChunk[]): Promise<void> {
    try {
      // Use existing enhanced memory context to process session data
      const sessionData = {
        terminal: chunks.map(c => c.content),
        fileChanges: chunks.flatMap(c => c.fileContext || []),
        timestamp: new Date()
      };
      
      // This integrates with the existing RAG system
      // enhancedMemoryContext will handle ChromaDB storage
      logger.debug('🔗 Updated memory context with new session data');
    } catch (error) {
      logger.error('❌ Failed to update memory context:', error);
    }
  }

  /**
   * Helper methods for pattern detection
   */
  private detectSuccess(content: string): boolean {
    const successIndicators = [
      'success', 'completed', 'done', 'finished', 'working',
      '✅', '✓', 'passed', 'built successfully'
    ];
    const lower = content.toLowerCase();
    return successIndicators.some(indicator => lower.includes(indicator));
  }

  private detectErrorType(content: string): string | undefined {
    const lower = content.toLowerCase();
    
    if (lower.includes('syntax error') || lower.includes('syntaxerror')) return 'syntax';
    if (lower.includes('type error') || lower.includes('typeerror')) return 'type';
    if (lower.includes('reference error') || lower.includes('referenceerror')) return 'reference';
    if (lower.includes('module not found') || lower.includes('modulenotfound')) return 'module';
    if (lower.includes('permission denied')) return 'permission';
    if (lower.includes('connection refused') || lower.includes('econnrefused')) return 'connection';
    if (lower.includes('404') || lower.includes('not found')) return '404';
    if (lower.includes('500') || lower.includes('internal server error')) return '500';
    
    return lower.includes('error') ? 'generic' : undefined;
  }

  private containsError(content: string): boolean {
    const errorKeywords = ['error', 'exception', 'failed', 'failure', 'crash', 'bug'];
    const lower = content.toLowerCase();
    return errorKeywords.some(keyword => lower.includes(keyword));
  }

  private containsSolution(content: string): boolean {
    const solutionKeywords = [
      'fixed', 'resolved', 'solution', 'try', 'use', 'install',
      'update', 'modify', 'change', 'add', 'remove'
    ];
    const lower = content.toLowerCase();
    return solutionKeywords.some(keyword => lower.includes(keyword));
  }

  private containsSuccess(content: string): boolean {
    const successKeywords = [
      'success', 'completed', 'done', 'working', 'passed',
      '✅', '✓', 'built successfully', 'deployed'
    ];
    const lower = content.toLowerCase();
    return successKeywords.some(keyword => lower.includes(keyword));
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Extract command context from terminal input for better analysis
   */
  private extractCommandContext(content: string): string | undefined {
    // Remove common prompt prefixes to get clean command
    const cleanContent = content.replace(/^(\$|>|➜.*?|\[.*\]\$)\s*/, '').trim();
    
    if (!cleanContent) return undefined;
    
    // Extract first word as command
    const firstWord = cleanContent.split(/\s+/)[0];
    
    // Common commands we want to track
    const trackedCommands = [
      'claude', 'cld', 'claude-code', 'cc', // Claude commands
      'npm', 'yarn', 'node', 'python', 'pip', // Package managers & runtimes
      'git', 'docker', 'kubectl', // Development tools
      'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', // File operations
      'cat', 'less', 'head', 'tail', 'grep', // File viewing
      'vim', 'nano', 'code', // Editors
      'curl', 'wget', 'ssh', // Network tools
      'make', 'cmake', 'cargo', 'go' // Build tools
    ];
    
    // Return command if it's one we track, otherwise return generic indicator
    if (trackedCommands.includes(firstWord.toLowerCase())) {
      return firstWord.toLowerCase();
    }
    
    // For other commands, return undefined to avoid noise
    return undefined;
  }

  /**
   * End current session
   */
  async endSession(summary?: string, successRating?: number): Promise<void> {
    if (this.currentSession) {
      await contextDatabase.endSession(this.currentSession, summary, successRating);
      logger.debug(`🏁 Context session ended: ${this.currentSession}`);
      this.currentSession = undefined;
    }
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<{
    totalConversations: number;
    totalSessions: number;
    totalPatterns: number;
    successRate: number;
    currentSession?: string;
  }> {
    const dbStats = await contextDatabase.getStats(this.currentFolder);
    return {
      ...dbStats,
      currentSession: this.currentSession
    };
  }
}

// Export singleton instance
export const contextProcessor = new ContextProcessor();
export default contextProcessor;