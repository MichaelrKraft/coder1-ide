/**
 * Context Injection API Route
 * Provides relevant historical context for new Claude sessions
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

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '3', 10); // Default to 3 recent conversations
    
    // Initialize database if needed
    await contextDatabase.initialize();
    
    // Get current project context
    const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
    const folder = await contextDatabase.getOrCreateFolder(projectPath);
    
    // Get recent conversations for context
    const conversations = await contextDatabase.getRecentConversations(folder.id, limit);
    
    if (conversations.length === 0) {
      return NextResponse.json({
        hasContext: false,
        contextMessage: "No previous Claude conversations found in this project.",
        summary: ""
      });
    }
    
    // Format recent conversations for context injection
    const recentConversations = conversations.map(conv => ({
      user: cleanDisplayText(conv.user_input),
      claude: cleanDisplayText(conv.claude_reply),
      timestamp: conv.timestamp,
      success: Boolean(conv.success),
      files: conv.files_involved ? JSON.parse(conv.files_involved) : []
    }));
    
    // Create context summary
    const contextSummary = generateContextSummary(recentConversations);
    
    // Create injection message for Claude
    const contextMessage = `Based on previous conversations in this project:

${recentConversations.map((conv, i) => `
**Previous conversation ${i + 1}** (${conv.timestamp}):
User: ${conv.user}
Claude: ${conv.claude}
${conv.files.length > 0 ? `Files involved: ${conv.files.join(', ')}` : ''}
`).join('\n')}

---
${contextSummary}

I can continue helping you with this project context in mind.`;

    logger.debug(`🧠 Generated context injection with ${conversations.length} conversations`);
    
    return NextResponse.json({
      hasContext: true,
      contextMessage,
      summary: contextSummary,
      conversationCount: conversations.length,
      recentConversations: recentConversations.map(conv => ({
        user: conv.user,
        claude: conv.claude.length > 100 ? conv.claude.substring(0, 100) + '...' : conv.claude,
        timestamp: conv.timestamp
      }))
    });
  } catch (error) {
    logger.error('❌ Failed to generate context injection:', error);
    
    return NextResponse.json({
      hasContext: false,
      error: 'Failed to retrieve context',
      contextMessage: "I'm starting fresh without previous context due to a technical issue.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

function generateContextSummary(conversations: any[]): string {
  const themes: string[] = [];
  const files = new Set<string>();
  const errors: string[] = [];
  const successes: string[] = [];
  
  conversations.forEach(conv => {
    // Extract files mentioned
    if (conv.files && conv.files.length > 0) {
      conv.files.forEach((file: string) => files.add(file));
    }
    
    // Categorize conversation types
    if (conv.user.toLowerCase().includes('debug') || conv.user.toLowerCase().includes('error') || conv.user.toLowerCase().includes('fix')) {
      errors.push(conv.user);
    }
    
    if (conv.success) {
      successes.push(conv.user);
    }
    
    // Extract common themes
    const userLower = conv.user.toLowerCase();
    if (userLower.includes('build') || userLower.includes('create')) themes.push('Building/Creating');
    if (userLower.includes('test')) themes.push('Testing');
    if (userLower.includes('deploy')) themes.push('Deployment');
    if (userLower.includes('refactor')) themes.push('Refactoring');
  });
  
  const summary: string[] = [];
  
  if (themes.length > 0) {
    const uniqueThemes = Array.from(new Set(themes));
    summary.push(`Recent focus areas: ${uniqueThemes.join(', ')}`);
  }
  
  if (files.size > 0) {
    summary.push(`Files recently worked on: ${Array.from(files).slice(0, 5).join(', ')}`);
  }
  
  if (errors.length > 0) {
    summary.push(`Recent debugging: ${errors.length} error-related conversations`);
  }
  
  if (successes.length > 0) {
    summary.push(`${successes.length} successful interactions`);
  }
  
  return summary.length > 0 
    ? `Context summary: ${summary.join('. ')}.`
    : "Recent general development conversations.";
}