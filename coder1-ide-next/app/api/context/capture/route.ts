/**
 * Context Capture API Route
 * Receives terminal data from Express backend for processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextProcessor, TerminalChunk } from '@/services/context-processor';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { chunks, sessionId, projectPath } = await request.json();
    
    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json({
        error: 'Terminal chunks array is required'
      }, { status: 400 });
    }
    
    // Initialize processor if needed
    const currentProjectPath = projectPath || '/Users/michaelkraft/autonomous_vibe_interface';
    const stats = await contextProcessor.getStats();
    
    // PHASE 2 FIX: Smart context processor initialization with session management
    // - Reuses existing sessions within 4-hour window
    // - Creates only one session per day maximum
    // - Includes automatic cleanup of old sessions
    // - Prevents memory exhaustion issues from Phase 1
    if (!stats.currentSession) {
      await contextProcessor.initialize(currentProjectPath);
      logger.debug('🚀 Context processor initialized with smart session management');
    }
    
    // Process the chunks
    const processedChunks: TerminalChunk[] = chunks.map((chunk: any) => ({
      timestamp: chunk.timestamp || Date.now(),
      type: chunk.type || 'terminal_output',
      content: chunk.content || '',
      sessionId: chunk.sessionId || sessionId,
      fileContext: chunk.fileContext,
      commandContext: chunk.commandContext
    }));
    
    await contextProcessor.processChunk(processedChunks);

    
    const updatedStats = await contextProcessor.getStats();
    
    logger.debug(`📥 Processed ${chunks.length} terminal chunks`);
    
    return NextResponse.json({
      success: true,
      processed: chunks.length,
      currentSession: updatedStats.currentSession,
      totalConversations: updatedStats.totalConversations
    });
  } catch (error) {
    logger.error('❌ Failed to capture context:', error);
    
    return NextResponse.json({
      error: 'Failed to capture context',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Return capture status and recent activity
    const stats = await contextProcessor.getStats();
    
    return NextResponse.json({
      isCapturing: !!stats.currentSession,
      currentSession: stats.currentSession,
      recentActivity: {
        conversations: stats.totalConversations,
        patterns: stats.totalPatterns,
        successRate: `${Math.round(stats.successRate * 100)}%`
      },
      status: stats.currentSession ? 'active' : 'idle'
    });
  } catch (error) {
    logger.error('❌ Failed to get capture status:', error);
    
    return NextResponse.json({
      error: 'Failed to get capture status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}