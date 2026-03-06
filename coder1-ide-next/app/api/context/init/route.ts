/**
 * Context System Initialization API Route
 * Initializes the Context Folders system automatically
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDatabase } from '@/services/context-database';
import { contextProcessor } from '@/services/context-processor';
import { contextFileWatcher } from '@/services/context-file-watcher';
import { logger } from '@/lib/logger';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Detect the appropriate project path based on environment
 */
function getProjectPath(requestedPath?: string): string {
  // If a specific path is requested and exists, use it
  if (requestedPath && existsSync(requestedPath)) {
    return requestedPath;
  }

  // Environment-specific path detection
  const isProduction = process.env.NODE_ENV === 'production';
  const isRender = process.env.RENDER_SERVICE_NAME !== undefined;
  
  if (isProduction || isRender) {
    // In production/Render, use current working directory
    const prodPath = process.env.PROJECT_PATH || process.cwd();
    logger.debug(`🌐 Production environment detected, using: ${prodPath}`);
    return prodPath;
  }
  
  // Development environment - try common local paths
  const devPaths = [
    process.env.PROJECT_PATH || process.cwd(),
    resolve(process.cwd(), '..')
  ];
  
  for (const path of devPaths) {
    if (existsSync(path)) {
      logger.debug(`🏠 Development environment, using: ${path}`);
      return path;
    }
  }
  
  // Fallback to current working directory
  logger.warn(`⚠️ No suitable project path found, falling back to: ${process.cwd()}`);
  return process.cwd();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { projectPath, autoStart = true } = await request.json();
    
    const currentProjectPath = getProjectPath(projectPath);
    
    logger.debug(`🚀 Initializing Context Folders system for: ${currentProjectPath}`);
    
    const isProduction = process.env.NODE_ENV === 'production';
    const isRender = process.env.RENDER_SERVICE_NAME !== undefined;
    const productionMode = isProduction || isRender;
    
    let initResults = {
      database: false,
      processor: false,
      fileWatcher: false,
      stats: null as any
    };
    
    // 1. Initialize database (always try this first)
    try {
      await contextDatabase.initialize();
      initResults.database = true;
      logger.debug('✅ Context database initialized');
    } catch (error) {
      logger.warn('⚠️ Context database initialization failed:', error);
      // Continue without database in production
      if (!productionMode) throw error;
    }
    
    // 2. Initialize context processor for this project
    try {
      await contextProcessor.initialize(currentProjectPath);
      initResults.processor = true;
      logger.debug('✅ Context processor initialized');
    } catch (error) {
      logger.warn('⚠️ Context processor initialization failed:', error);
      // Continue without processor in production
      if (!productionMode) throw error;
    }
    
    // 3. Start file watcher if autoStart is enabled (skip in production environments)
    if (autoStart && !productionMode) {
      try {
        await contextFileWatcher.watchProject(currentProjectPath);
        initResults.fileWatcher = true;
        logger.debug('✅ File watcher started');
      } catch (error) {
        logger.warn('⚠️ File watcher initialization failed:', error);
        // File watcher failure is non-critical, continue
      }
    } else if (productionMode) {
      logger.debug('🌐 Skipping file watcher in production environment');
    }
    
    // 4. Get initial stats (with fallback)
    try {
      initResults.stats = await contextProcessor.getStats();
    } catch (error) {
      logger.warn('⚠️ Failed to get context stats, using fallback');
      initResults.stats = {
        currentSession: `session_${Date.now()}_${productionMode ? 'prod' : 'dev'}`,
        totalConversations: 0,
        totalSessions: 0,
        totalPatterns: 0,
        successRate: 0
      };
    }
    
    const successfulServices = Object.values(initResults).filter(Boolean).length - 1; // -1 for stats
    const message = productionMode 
      ? `Context system initialized in production mode (${successfulServices}/3 services active)`
      : 'Context Folders system initialized successfully';
    
    logger.debug(`🧠 ${message}`);
    
    return NextResponse.json({
      success: true,
      message,
      environment: {
        mode: productionMode ? 'production' : 'development',
        isRender: isRender,
        projectPath: currentProjectPath
      },
      services: {
        database: initResults.database,
        processor: initResults.processor,
        fileWatcher: initResults.fileWatcher
      },
      stats: {
        currentSession: initResults.stats.currentSession,
        totalConversations: initResults.stats.totalConversations,
        totalSessions: initResults.stats.totalSessions,
        totalPatterns: initResults.stats.totalPatterns,
        successRate: Math.round(initResults.stats.successRate * 100)
      },
      fileWatcherActive: autoStart && !productionMode
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