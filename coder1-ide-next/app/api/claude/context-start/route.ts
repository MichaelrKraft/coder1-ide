/**
 * Claude Context Start API Route
 * Provides context-aware session initialization for new Claude interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDatabase } from '@/services/context-database';
import { logger } from '@/lib/logger';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userInput, includeFullContext = false } = body;
    
    if (!userInput) {
      return NextResponse.json({
        error: 'userInput is required'
      }, { status: 400 });
    }
    
    // Initialize database if needed
    await contextDatabase.initialize();
    
    // Get current project context
    const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
    const folder = await contextDatabase.getOrCreateFolder(projectPath);
    
    // Get recent conversations for context
    const limit = includeFullContext ? 5 : 2;
    const conversations = await contextDatabase.getRecentConversations(folder.id, limit);
    
    let contextEnhancedPrompt = userInput;
    
    if (conversations.length > 0) {
      // Filter out empty or purely technical conversations
      const meaningfulConversations = conversations.filter(conv => {
        const cleanUser = cleanDisplayText(conv.user_input);
        const cleanClaude = cleanDisplayText(conv.claude_reply);
        
        return (
          cleanUser && 
          cleanClaude && 
          cleanUser !== '[Interactive Claude session started]' &&
          cleanUser.length > 10 &&
          cleanClaude.length > 10 &&
          !cleanClaude.includes('[?25l') // Filter out terminal control sequences
        );
      });
      
      if (meaningfulConversations.length > 0) {
        const contextSummary = meaningfulConversations.map((conv, i) => {
          const cleanUser = cleanDisplayText(conv.user_input);
          const cleanClaude = cleanDisplayText(conv.claude_reply);
          
          return `Previous conversation ${i + 1}: User asked "${cleanUser}" and you replied "${cleanClaude.length > 150 ? cleanClaude.substring(0, 150) + '...' : cleanClaude}"`;
        }).join('\n');
        
        contextEnhancedPrompt = `Based on our previous ${meaningfulConversations.length} conversation(s) in this Coder1 IDE project:

${contextSummary}

Current request: ${userInput}

Please provide a response that takes into account our conversation history and the context of this development project.`;
      }
    }
    
    logger.debug(`🧠 Enhanced Claude prompt with ${conversations.length} conversations context`);
    
    return NextResponse.json({
      success: true,
      enhancedPrompt: contextEnhancedPrompt,
      originalPrompt: userInput,
      contextApplied: conversations.length > 0,
      conversationsUsed: conversations.length,
      projectContext: folder.name
    });
  } catch (error) {
    logger.error('❌ Failed to create context-enhanced prompt:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to enhance prompt with context',
      enhancedPrompt: request.body ? (await request.json()).userInput : '',
      originalPrompt: request.body ? (await request.json()).userInput : '',
      contextApplied: false,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Return context availability info
    const searchParams = request.nextUrl.searchParams;
    const includePreview = searchParams.get('preview') === 'true';
    
    // Initialize database if needed
    await contextDatabase.initialize();
    
    // Get current project context
    const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
    const folder = await contextDatabase.getOrCreateFolder(projectPath);
    
    // Get recent conversations for preview
    const conversations = await contextDatabase.getRecentConversations(folder.id, 3);
    
    const stats = await contextDatabase.getStats(folder.id);
    
    const response: any = {
      hasContext: conversations.length > 0,
      totalConversations: stats.totalConversations,
      totalSessions: stats.totalSessions,
      recentConversationsCount: conversations.length,
      projectName: folder.name
    };
    
    if (includePreview && conversations.length > 0) {
      response.recentConversations = conversations.map(conv => ({
        user: cleanDisplayText(conv.user_input),
        claude: cleanDisplayText(conv.claude_reply).substring(0, 100) + '...',
        timestamp: conv.timestamp
      }));
    }
    
    return NextResponse.json(response);
  } catch (error) {
    logger.error('❌ Failed to get context info:', error);
    
    return NextResponse.json({
      hasContext: false,
      error: 'Failed to retrieve context info',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}