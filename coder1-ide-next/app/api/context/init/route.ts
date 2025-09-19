/**
 * Context System Initialization API Route
 * Initializes the Context Folders system automatically
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDatabase } from '@/services/context-database';
import { contextProcessor } from '@/services/context-processor';
import { contextFileWatcher } from '@/services/context-file-watcher';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { projectPath, autoStart = true } = await request.json();
    
    const currentProjectPath = projectPath || '/Users/michaelkraft/autonomous_vibe_interface';
    
    logger.debug('🚀 Initializing Context Folders system...');
    
    // 1. Initialize database
    await contextDatabase.initialize();
    logger.debug('✅ Context database initialized');
    
    // 2. Initialize context processor for this project
    await contextProcessor.initialize(currentProjectPath);
    logger.debug('✅ Context processor initialized');
    
    // 3. Start file watcher if autoStart is enabled
    if (autoStart) {
      await contextFileWatcher.watchProject(currentProjectPath);
      logger.debug('✅ File watcher started');
    }
    
    // 4. Get initial stats
    const stats = await contextProcessor.getStats();
    
    logger.debug('🧠 Context Folders system ready!');
    
    return NextResponse.json({
      success: true,
      message: 'Context Folders system initialized successfully',
      stats: {
        currentSession: stats.currentSession,
        totalConversations: stats.totalConversations,
        totalSessions: stats.totalSessions,
        totalPatterns: stats.totalPatterns,
        successRate: Math.round(stats.successRate * 100)
      },
      projectPath: currentProjectPath,
      fileWatcherActive: autoStart
    });
  } catch (error) {
    logger.error('❌ Failed to initialize Context Folders system:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize Context system',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get system status
    const processorStats = await contextProcessor.getStats();
    const watcherStatus = contextFileWatcher.getStatus();
    const dbStats = await contextDatabase.getStats();
    
    return NextResponse.json({
      success: true,
      status: {
        processor: {
          currentSession: processorStats.currentSession,
          isActive: !!processorStats.currentSession
        },
        watcher: {
          isWatching: watcherStatus.isWatching,
          watchedPaths: watcherStatus.watchedPaths,
          bufferedChanges: watcherStatus.bufferedChanges
        },
        database: {
          totalConversations: dbStats.totalConversations,
          totalSessions: dbStats.totalSessions,
          totalPatterns: dbStats.totalPatterns,
          successRate: Math.round(dbStats.successRate * 100)
        }
      }
    });
  } catch (error) {
    logger.error('❌ Failed to get Context system status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get Context system status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}