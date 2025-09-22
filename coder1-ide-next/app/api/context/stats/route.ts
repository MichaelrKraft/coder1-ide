/**
 * Context Stats API Route
 * Returns memory statistics for the Context Folders system
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDatabase } from '@/services/context-database';
import { contextProcessor } from '@/services/context-processor';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get processor stats (includes current session info)
    const processorStats = await contextProcessor.getStats();
    
    // Get database stats for current project
    const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
    const folder = await contextDatabase.getOrCreateFolder(projectPath);
    const dbStats = await contextDatabase.getStats(folder.id);
    
    const stats = {
      // Current session status
      isLearning: !!processorStats.currentSession,
      currentSession: processorStats.currentSession,
      
      // Memory counts
      totalConversations: dbStats.totalConversations,
      totalSessions: dbStats.totalSessions,
      totalPatterns: dbStats.totalPatterns,
      totalInsights: dbStats.totalInsights,
      
      // Quality metrics
      successRate: Math.round(dbStats.successRate * 100),
      
      // Display text for StatusBar
      memoryText: `${dbStats.totalConversations} memories`,
      statusText: processorStats.currentSession ? '🟢 Learning' : '⚫ Idle',
      
      // Debug information for troubleshooting
      debug: {
        processingStats: processorStats,
        databaseStats: dbStats,
        capturePatterns: [
          'Listening for: claude, cld, claude-code, cc commands',
          'Also capturing: I will, I can, Let me, Here is responses',
          'Session detection: starting claude code, welcome patterns'
        ]
      },
      
      // Additional context
      folderName: 'Coder1 IDE',
      lastUpdate: new Date().toISOString()
    };
    
    logger.debug('📊 Context stats requested:', stats);
    
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('❌ Failed to get context stats:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve context statistics',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { action, projectPath } = await request.json();
    
    switch (action) {
      case 'initialize':
        // Initialize context processor for project
        await contextProcessor.initialize(projectPath || '/Users/michaelkraft/autonomous_vibe_interface');
        
        return NextResponse.json({
          success: true,
          message: 'Context processor initialized',
          sessionId: (await contextProcessor.getStats()).currentSession
        });
        
      case 'end_session':
        const { summary, successRating } = await request.json();
        await contextProcessor.endSession(summary, successRating);
        
        return NextResponse.json({
          success: true,
          message: 'Context session ended'
        });
        
      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('❌ Failed to handle context stats action:', error);
    
    return NextResponse.json({
      error: 'Failed to handle context action',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}