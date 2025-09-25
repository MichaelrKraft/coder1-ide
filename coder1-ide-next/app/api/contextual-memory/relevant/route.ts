/**
 * Contextual Memory Relevant API Route
 * Returns relevant past conversations for current user context
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextualRetrieval, ContextualQuery } from '@/services/contextual-retrieval';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const startTime = Date.now();
    
    const query: ContextualQuery = await request.json();
    
    // Validate required fields
    if (!query.userInput || query.userInput.trim().length === 0) {
      return NextResponse.json({
        error: 'userInput is required'
      }, { status: 400 });
    }
    
    logger.debug(`🧠 Contextual memory request: "${query.userInput}"`);
    
    // Find relevant memories
    const relevantMemories = await contextualRetrieval.findRelevantMemories(query);
    
    const processingTime = Date.now() - startTime;
    
    const response = {
      success: true,
      memories: relevantMemories,
      stats: {
        totalFound: relevantMemories.length,
        processingTimeMs: processingTime,
        query: {
          userInput: query.userInput,
          hasFileContext: (query.currentFiles?.length || 0) > 0,
          hasErrorContext: !!query.errorContext,
          hasCommandContext: (query.recentCommands?.length || 0) > 0
        }
      },
      // Include helpful debugging info
      debug: {
        timestamp: new Date().toISOString(),
        hasRelevantMemories: relevantMemories.length > 0,
        topScore: relevantMemories.length > 0 ? relevantMemories[0].relevanceScore : 0
      }
    };
    
    if (relevantMemories.length > 0) {
      logger.info(`✅ Found ${relevantMemories.length} relevant memories in ${processingTime}ms`);
    } else {
      logger.debug(`📭 No relevant memories found for: "${query.userInput}"`);
    }
    
    return NextResponse.json(response);
  } catch (error) {
    logger.error('❌ Failed to get relevant memories:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve relevant memories',
      details: error instanceof Error ? error.message : String(error),
      memories: []
    }, { status: 500 });
  }
}

// GET endpoint for health check and basic info
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Simple health check
    return NextResponse.json({
      service: 'Contextual Memory Relevant API',
      status: 'healthy',
      version: '1.0.0',
      endpoints: {
        POST: 'Find relevant memories for user input and context',
        GET: 'Health check and service info'
      },
      usage: {
        POST: {
          body: {
            userInput: 'string (required) - Current user input or question',
            currentFiles: 'string[] (optional) - Files currently open or being worked on',
            recentCommands: 'string[] (optional) - Recent terminal commands',
            errorContext: 'string (optional) - Error message or context if applicable',
            projectContext: 'string (optional) - Additional project context'
          },
          response: {
            success: 'boolean',
            memories: 'RelevantMemory[] - Array of relevant past conversations',
            stats: 'object - Processing statistics',
            debug: 'object - Debug information'
          }
        }
      },
      sampleRequest: {
        userInput: "claude fix this authentication error",
        currentFiles: ["auth.js", "login.tsx"],
        errorContext: "JWT token expired",
        recentCommands: ["npm start", "curl localhost:3000/login"]
      }
    });
  } catch (error) {
    logger.error('❌ Failed to get contextual memory service info:', error);
    
    return NextResponse.json({
      service: 'Contextual Memory Relevant API',
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}