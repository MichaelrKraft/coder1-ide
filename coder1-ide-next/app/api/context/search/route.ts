/**
 * Context Search API Route
 * Searches through Claude's memory for relevant conversations and patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDatabase } from '@/services/context-database';
import { enhancedMemoryContext } from '@/services/enhanced-memory-context';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { 
      query, 
      limit = 10, 
      includePatterns = true, 
      includeConversations = true,
      timeframe = 'last_7_days'
    } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({
        error: 'Query string is required'
      }, { status: 400 });
    }
    
    // Initialize database if needed
    await contextDatabase.initialize();
    
    // Get current project context
    const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
    const folder = await contextDatabase.getOrCreateFolder(projectPath);
    
    const results = {
      query,
      totalResults: 0,
      conversations: [] as any[],
      patterns: [] as any[],
      relevantContext: null as any
    };
    
    // Search recent conversations
    if (includeConversations) {
      const conversations = await contextDatabase.getRecentConversations(folder.id, limit);
      
      // Filter conversations by query relevance
      const relevantConversations = conversations.filter(conv => {
        const combined = `${conv.user_input} ${conv.claude_reply}`.toLowerCase();
        return combined.includes(query.toLowerCase());
      }).slice(0, limit);
      
      results.conversations = relevantConversations.map(conv => ({
        id: conv.id,
        userInput: conv.user_input,
        claudeReply: conv.claude_reply.substring(0, 300) + (conv.claude_reply.length > 300 ? '...' : ''),
        timestamp: conv.timestamp,
        success: conv.success,
        errorType: conv.error_type,
        filesInvolved: conv.files_involved ? JSON.parse(conv.files_involved) : [],
        tokensUsed: conv.tokens_used,
        relevanceScore: calculateRelevanceScore(query, conv.user_input + ' ' + conv.claude_reply)
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    
    // Search patterns if requested
    if (includePatterns) {
      // This would integrate with the existing enhanced memory context
      try {
        const memoryContext = await enhancedMemoryContext.getMemoryContext({
          taskDescription: query,
          timeframe,
          limit
        });
        
        results.relevantContext = {
          relevantPatterns: memoryContext.relevantPatterns.slice(0, 5),
          relatedOutcomes: memoryContext.relatedOutcomes.slice(0, 3),
          commonIssues: memoryContext.commonIssues.slice(0, 3),
          successfulApproaches: memoryContext.successfulApproaches.slice(0, 3)
        };
      } catch (error) {
        logger.warn('⚠️ Could not retrieve enhanced memory context:', error);
      }
    }
    
    results.totalResults = results.conversations.length + 
                          (results.relevantContext?.relevantPatterns?.length || 0);
    
    logger.debug(`🔍 Context search for "${query}": ${results.totalResults} results`);
    
    return NextResponse.json(results);
  } catch (error) {
    logger.error('❌ Failed to search context:', error);
    
    return NextResponse.json({
      error: 'Failed to search context',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper function to calculate relevance score
function calculateRelevanceScore(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  let matchCount = 0;
  queryWords.forEach(word => {
    if (textWords.includes(word)) {
      matchCount++;
    }
  });
  
  return matchCount / queryWords.length;
}