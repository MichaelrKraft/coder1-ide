/**
 * Contextual Retrieval Service
 * Makes Context Memory intelligent through smart retrieval of past conversations
 * No ML needed - just brilliant SQL queries and contextual matching
 */

import { contextDatabase, ClaudeConversation } from './context-database';
import { logger } from '@/lib/logger';
import { 
  extractClaudeContent, 
  generateSmartSummary, 
  formatFriendlyTime
} from '@/lib/terminal-cleaner';

export interface RelevantMemory {
  id: string;
  conversation: ClaudeConversation;
  relevanceScore: number;
  matchReason: string;
  timeAgo: string;
  sessionSummary?: string;
  quickPreview: string;
}

export interface ContextualQuery {
  userInput: string;
  currentFiles?: string[];
  recentCommands?: string[];
  errorContext?: string;
  projectContext?: string;
}

export class ContextualRetrievalService {
  private keywordCache = new Map<string, string[]>();
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'this', 'that', 'these', 'those', 'i', 'you', 'we', 'they',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might'
  ]);

  /**
   * Find relevant past conversations for current user input
   */
  async findRelevantMemories(query: ContextualQuery): Promise<RelevantMemory[]> {
    try {
      const startTime = Date.now();
      
      // Extract meaningful keywords and context
      const keywords = this.extractKeywords(query.userInput);
      const fileExtensions = this.extractFileExtensions(query.currentFiles || []);
      const errorKeywords = this.extractErrorKeywords(query.errorContext || '');
      
      logger.debug(`🔍 Contextual retrieval for: "${query.userInput}"`);
      logger.debug(`📋 Keywords: ${keywords.join(', ')}`);
      logger.debug(`📁 File context: ${fileExtensions.join(', ')}`);
      
      // Build smart SQL query for contextual matching
      const conversations = await this.queryRelevantConversations({
        keywords,
        fileExtensions,
        errorKeywords,
        recentCommands: query.recentCommands || [],
        userInput: query.userInput
      });
      
      // Score and rank results by relevance
      const relevantMemories = await this.scoreAndRankResults(conversations, query);
      
      const processingTime = Date.now() - startTime;
      logger.debug(`✅ Found ${relevantMemories.length} relevant memories in ${processingTime}ms`);
      
      return relevantMemories.slice(0, 5); // Return top 5 most relevant
    } catch (error) {
      logger.error('❌ Failed to find relevant memories:', error);
      return [];
    }
  }

  /**
   * Extract meaningful keywords from user input
   */
  private extractKeywords(input: string): string[] {
    const cacheKey = input.toLowerCase();
    if (this.keywordCache.has(cacheKey)) {
      return this.keywordCache.get(cacheKey)!;
    }

    const keywords: string[] = [];
    
    // Technical terms and commands (high priority)
    const techTerms = input.match(/\b(npm|yarn|node|python|pip|git|docker|kubectl|curl|wget|ssh|vim|nano|code|jest|test|build|deploy|error|bug|fix|install|update|configure|setup|auth|login|token|api|database|db|sql|json|xml|html|css|js|ts|jsx|tsx|py|java|cpp|c\+\+|rust|go|php|ruby|swift|kotlin)\b/gi);
    if (techTerms) {
      keywords.push(...techTerms.map(term => term.toLowerCase()));
    }
    
    // Error patterns (high priority)  
    const errorPatterns = input.match(/\b(error|exception|failed|failure|crash|bug|issue|problem|broken|not working|doesn't work|can't|cannot|unable)\b/gi);
    if (errorPatterns) {
      keywords.push(...errorPatterns.map(term => term.toLowerCase()));
    }
    
    // File patterns (medium priority)
    const filePatterns = input.match(/\b\w+\.(js|ts|jsx|tsx|py|java|cpp|c|rs|go|php|rb|swift|kt|html|css|scss|json|xml|md|txt|yml|yaml|dockerfile|makefile)\b/gi);
    if (filePatterns) {
      keywords.push(...filePatterns.map(term => term.toLowerCase()));
    }
    
    // Framework/library names (medium priority)
    const frameworks = input.match(/\b(react|vue|angular|express|fastapi|django|flask|spring|laravel|rails|nextjs|nuxt|gatsby|webpack|vite|babel|typescript|javascript|python|java|node|deno|bun)\b/gi);
    if (frameworks) {
      keywords.push(...frameworks.map(term => term.toLowerCase()));
    }
    
    // General meaningful words (lower priority)
    const words = input.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !this.stopWords.has(word) &&
        !keywords.includes(word) // Don't duplicate high-priority terms
      );
    
    keywords.push(...words);
    
    // Cache the result
    this.keywordCache.set(cacheKey, keywords);
    
    return keywords;
  }

  /**
   * Extract file extensions for context matching
   */
  private extractFileExtensions(files: string[]): string[] {
    return files
      .map(file => {
        const ext = file.split('.').pop()?.toLowerCase();
        return ext || '';
      })
      .filter(ext => ext.length > 0);
  }

  /**
   * Extract error-specific keywords
   */
  private extractErrorKeywords(errorText: string): string[] {
    const errorKeywords: string[] = [];
    
    // Common error types
    const errorTypes = errorText.match(/\b(syntaxerror|typeerror|referenceerror|rangeerror|evalerror|urierror|aggregateerror|internalerror|404|500|403|401|timeout|connection|refused|denied|not found|module not found|command not found|permission denied|access denied)\b/gi);
    if (errorTypes) {
      errorKeywords.push(...errorTypes.map(err => err.toLowerCase()));
    }
    
    // HTTP status codes
    const statusCodes = errorText.match(/\b(200|201|400|401|403|404|500|502|503|504)\b/g);
    if (statusCodes) {
      errorKeywords.push(...statusCodes);
    }
    
    // Package/module names in errors
    const moduleErrors = errorText.match(/module ['"]([^'"]+)['"]/gi);
    if (moduleErrors) {
      errorKeywords.push(...moduleErrors.map(match => {
        const module = match.match(/module ['"]([^'"]+)['"]/i)?.[1];
        return module?.toLowerCase() || '';
      }).filter(Boolean));
    }
    
    return errorKeywords;
  }

  /**
   * Query database for relevant conversations using smart SQL
   */
  private async queryRelevantConversations(params: {
    keywords: string[];
    fileExtensions: string[];
    errorKeywords: string[];
    recentCommands: string[];
    userInput: string;
  }): Promise<ClaudeConversation[]> {
    await contextDatabase.initialize();
    
    if (!contextDatabase['db']) {
      logger.warn('Context database not initialized');
      return [];
    }
    
    try {
      // Build dynamic SQL query based on available context
      let query = `
        SELECT cc.*, cs.summary as session_summary
        FROM claude_conversations cc
        JOIN context_sessions cs ON cc.session_id = cs.id
        WHERE cc.success = 1
      `;
      
      const queryParams: any[] = [];
      const conditions: string[] = [];
      
      // Keyword matching in user input and Claude replies
      if (params.keywords.length > 0) {
        const keywordConditions = params.keywords.map(() => 
          `(cc.user_input LIKE ? OR cc.claude_reply LIKE ?)`
        );
        conditions.push(`(${keywordConditions.join(' OR ')})`);
        
        params.keywords.forEach(keyword => {
          queryParams.push(`%${keyword}%`, `%${keyword}%`);
        });
      }
      
      // Error-specific matching
      if (params.errorKeywords.length > 0) {
        const errorConditions = params.errorKeywords.map(() => 
          `(cc.user_input LIKE ? OR cc.claude_reply LIKE ? OR cc.error_type LIKE ?)`
        );
        conditions.push(`(${errorConditions.join(' OR ')})`);
        
        params.errorKeywords.forEach(keyword => {
          queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        });
      }
      
      // File context matching
      if (params.fileExtensions.length > 0) {
        const fileConditions = params.fileExtensions.map(() => 
          `cc.files_involved LIKE ?`
        );
        conditions.push(`(${fileConditions.join(' OR ')})`);
        
        params.fileExtensions.forEach(ext => {
          queryParams.push(`%.${ext}%`);
        });
      }
      
      // Add conditions to query
      if (conditions.length > 0) {
        query += ` AND (${conditions.join(' OR ')})`;
      }
      
      // Order by recency and limit results
      query += ` ORDER BY cc.timestamp DESC LIMIT 20`;
      
      logger.debug(`🔍 Contextual SQL query: ${query}`);
      logger.debug(`📋 Query params: ${queryParams.length} parameters`);
      
      const results = contextDatabase['db'].prepare(query).all(...queryParams) as (ClaudeConversation & { session_summary?: string })[];
      
      return results;
    } catch (error) {
      logger.error('❌ Failed to query relevant conversations:', error);
      return [];
    }
  }

  /**
   * Score and rank results by relevance
   */
  private async scoreAndRankResults(
    conversations: (ClaudeConversation & { session_summary?: string })[],
    query: ContextualQuery
  ): Promise<RelevantMemory[]> {
    const scoredResults: RelevantMemory[] = [];
    
    for (const conv of conversations) {
      const score = this.calculateRelevanceScore(conv, query);
      
      if (score > 0.3) { // Minimum relevance threshold
        const relevantMemory: RelevantMemory = {
          id: conv.id,
          conversation: conv,
          relevanceScore: score,
          matchReason: this.generateMatchReason(conv, query),
          timeAgo: this.formatTimeAgo(new Date(conv.timestamp)),
          sessionSummary: conv.session_summary,
          quickPreview: this.generateQuickPreview(conv)
        };
        
        scoredResults.push(relevantMemory);
      }
    }
    
    // Sort by relevance score (highest first)
    return scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score for a conversation
   */
  private calculateRelevanceScore(
    conversation: ClaudeConversation,
    query: ContextualQuery
  ): number {
    let score = 0;
    const userInput = conversation.user_input.toLowerCase();
    const claudeReply = conversation.claude_reply.toLowerCase();
    const queryLower = query.userInput.toLowerCase();
    
    // Direct keyword matches (high weight)
    const keywords = this.extractKeywords(query.userInput);
    keywords.forEach(keyword => {
      if (userInput.includes(keyword)) score += 0.3;
      if (claudeReply.includes(keyword)) score += 0.2;
    });
    
    // Error context matching (very high weight)
    if (query.errorContext) {
      const errorKeywords = this.extractErrorKeywords(query.errorContext);
      errorKeywords.forEach(keyword => {
        if (userInput.includes(keyword) || claudeReply.includes(keyword)) {
          score += 0.5;
        }
      });
    }
    
    // File context matching (medium weight)
    if (query.currentFiles && query.currentFiles.length > 0) {
      const filesInvolved = conversation.files_involved ? 
        JSON.parse(conversation.files_involved) as string[] : [];
      
      query.currentFiles.forEach(currentFile => {
        if (filesInvolved.some(file => file.includes(currentFile) || currentFile.includes(file))) {
          score += 0.25;
        }
      });
    }
    
    // Recency bonus (more recent = slightly higher score)
    const daysSince = (Date.now() - new Date(conversation.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 0.1; // Recent conversations get small boost
    
    // Success bonus (successful conversations are more valuable)
    if (conversation.success) score += 0.1;
    
    // Conversation length bonus (longer conversations usually more valuable)
    const replyLength = conversation.claude_reply.length;
    if (replyLength > 500) score += 0.05;
    if (replyLength > 1000) score += 0.05;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Generate human-readable match reason with emoji
   */
  private generateMatchReason(conversation: ClaudeConversation, query: ContextualQuery): string {
    const reasons: string[] = [];
    
    const keywords = this.extractKeywords(query.userInput);
    const userInput = conversation.user_input.toLowerCase();
    const claudeReply = conversation.claude_reply.toLowerCase();
    
    // Check for keyword matches
    const matchedKeywords = keywords.filter(keyword => 
      userInput.includes(keyword) || claudeReply.includes(keyword)
    );
    
    if (matchedKeywords.length > 0) {
      reasons.push(`Similar keywords: ${matchedKeywords.slice(0, 3).join(', ')}`);
    }
    
    // Check for file context
    if (query.currentFiles && conversation.files_involved) {
      try {
        const filesInvolved = JSON.parse(conversation.files_involved) as string[];
        const commonFiles = query.currentFiles.filter(currentFile =>
          filesInvolved.some(file => file.includes(currentFile) || currentFile.includes(file))
        );
        
        if (commonFiles.length > 0) {
          reasons.push(`Same files: ${commonFiles.slice(0, 2).join(', ')}`);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    // Check for error context
    if (query.errorContext && conversation.error_type) {
      reasons.push(`Similar error type: ${conversation.error_type}`);
    }
    
    return reasons.length > 0 ? reasons.join(' • ') : 'Similar context';
  }

  /**
   * Format time difference as human-readable string
   */
  private formatTimeAgo(timestamp: Date): string {
    // Use the friendly time formatter from terminal-cleaner
    return formatFriendlyTime(timestamp);
  }

  /**
   * Generate quick preview of the solution
   */
  private generateQuickPreview(conversation: ClaudeConversation): string {
    const reply = conversation.claude_reply;
    
    // First, clean the terminal output to remove ANSI codes and control characters
    const cleanedReply = extractClaudeContent(reply);
    
    // Generate a smart summary using the terminal cleaner
    const summary = generateSmartSummary(cleanedReply);
    
    // Return the cleaned, summarized preview without emoji
    return summary;
  }

  /**
   * Clear keyword cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.keywordCache.clear();
    logger.debug('🧹 Cleared contextual retrieval cache');
  }
}

// Export singleton instance
export const contextualRetrieval = new ContextualRetrievalService();
export default contextualRetrieval;