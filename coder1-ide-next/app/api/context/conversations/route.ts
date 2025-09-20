/**
 * Context Conversations API Route
 * Retrieves recent conversations from Claude's memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDatabase } from '@/services/context-database';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'; // Prevent static generation

// Helper function to clean ANSI escape codes and formatting characters
function cleanDisplayText(text: string): string {
  if (!text) return text;
  
  return text
    // Remove ANSI escape codes
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    // Remove other control characters
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove most control characters
    // Clean up specific patterns from Claude Code CLI
    .replace(/\[201~.*?\]/g, '') // Remove specific bracketed sequences
    .replace(/\[.*?~.*?\]/g, '') // Remove other bracketed sequences
    .replace(/\[201~/g, '') // Remove standalone [201~ sequences
    // Remove box drawing characters and formatting
    .replace(/[╭╮╰╯│─┌┐└┘├┤┬┴┼]/g, '')
    // Remove repeated symbols
    .replace(/[─]{2,}/g, '')
    .replace(/[│]{2,}/g, '')
    // Clean up repeated whitespace
    .replace(/\s+/g, ' ')
    // Remove leading/trailing symbols
    .replace(/^[│\s]+/, '')
    .replace(/[│\s]+$/, '')
    // Trim
    .trim();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Initialize database if needed
    await contextDatabase.initialize();
    
    // Get current project context
    const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
    const folder = await contextDatabase.getOrCreateFolder(projectPath);
    
    // Get recent conversations
    const conversations = await contextDatabase.getRecentConversations(folder.id, limit);
    
    // Format conversations for display with cleaned text
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      userInput: cleanDisplayText(conv.user_input),
      claudeReply: cleanDisplayText(conv.claude_reply),
      timestamp: conv.timestamp,
      success: conv.success,
      errorType: conv.error_type,
      filesInvolved: conv.files_involved ? JSON.parse(conv.files_involved) : [],
      tokensUsed: conv.tokens_used
    }));
    
    // Get total count
    const totalConversations = formattedConversations.length;
    
    logger.debug(`📚 Retrieved ${formattedConversations.length} conversations from memory`);
    
    return NextResponse.json({
      conversations: formattedConversations,
      total: totalConversations,
      limit,
      offset,
      hasMore: false // We'll just return what we have for now
    });
  } catch (error) {
    logger.error('❌ Failed to retrieve conversations:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve conversations',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}