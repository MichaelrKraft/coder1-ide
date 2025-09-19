/**
 * Browser Session API - Phase 2: Web-Native Context System
 * 
 * Handles server-side browser session management and lazy context activation.
 * Works with client-side BrowserSessionManager to provide intelligent context sessions.
 * Updated for testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDatabase } from '@/services/context-database';
import { contextProcessor } from '@/services/context-processor';
import { contextFileWatcher } from '@/services/context-file-watcher';

// Server-side browser session tracking
const activeBrowserSessions = new Map<string, {
  browserSessionId: string;
  userSessionId: string;
  contextSessionId?: string;
  createdAt: number;
  lastActivity: number;
  projectPath: string;
}>();

/**
 * POST /api/browser-session - Initialize or get browser session status
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { 
      action, 
      browserSessionId, 
      userSessionId, 
      projectPath = '/Users/michaelkraft/autonomous_vibe_interface' 
    } = await request.json();

    switch (action) {
      case 'init':
        return handleSessionInit(browserSessionId, userSessionId, projectPath);
      
      case 'activate_context':
        return handleContextActivation(browserSessionId, userSessionId, projectPath);
      
      case 'deactivate_context':
        return handleContextDeactivation(browserSessionId);
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: init, activate_context, deactivate_context' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Browser session API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/browser-session - Get session status and analytics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const browserSessionId = searchParams.get('browserSessionId');
    
    if (browserSessionId) {
      // Get specific session status
      const session = activeBrowserSessions.get(browserSessionId);
      if (!session) {
        return NextResponse.json({
          success: true,
          exists: false,
          message: 'Browser session not found on server'
        });
      }

      return NextResponse.json({
        success: true,
        exists: true,
        session: {
          browserSessionId: session.browserSessionId,
          hasContextSession: !!session.contextSessionId,
          contextSessionId: session.contextSessionId,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          age: Date.now() - session.createdAt
        }
      });
    } else {
      // Get server analytics
      const totalSessions = activeBrowserSessions.size;
      const sessionsWithContext = Array.from(activeBrowserSessions.values())
        .filter(s => s.contextSessionId).length;
      
      return NextResponse.json({
        success: true,
        analytics: {
          totalActiveSessions: totalSessions,
          sessionsWithContext,
          contextActivationRate: totalSessions > 0 ? Math.round((sessionsWithContext / totalSessions) * 100) : 0,
          memoryUsage: process.memoryUsage(),
          uptime: Math.round(process.uptime() / 60) // minutes
        }
      });
    }
  } catch (error) {
    console.error('Browser session status error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get session status' 
    }, { status: 500 });
  }
}

// Helper functions

async function handleSessionInit(
  browserSessionId: string, 
  userSessionId: string, 
  projectPath: string
): Promise<NextResponse> {
  if (!browserSessionId || !userSessionId) {
    return NextResponse.json({ 
      success: false, 
      error: 'browserSessionId and userSessionId are required' 
    }, { status: 400 });
  }

  // Register browser session (without creating context session)
  const sessionInfo = {
    browserSessionId,
    userSessionId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    projectPath
  };

  activeBrowserSessions.set(browserSessionId, sessionInfo);

  console.log(`🌐 Browser session registered: ${browserSessionId.substring(0, 8)}... (user: ${userSessionId.substring(0, 8)}...)`);

  return NextResponse.json({
    success: true,
    message: 'Browser session initialized',
    session: {
      browserSessionId,
      hasContextSession: false,
      registered: true
    }
  });
}

async function handleContextActivation(
  browserSessionId: string, 
  userSessionId: string, 
  projectPath: string
): Promise<NextResponse> {
  if (!browserSessionId) {
    return NextResponse.json({ 
      success: false, 
      error: 'browserSessionId is required' 
    }, { status: 400 });
  }

  const session = activeBrowserSessions.get(browserSessionId);
  if (!session) {
    return NextResponse.json({ 
      success: false, 
      error: 'Browser session not found. Initialize first.' 
    }, { status: 404 });
  }

  // If already has context session, return it
  if (session.contextSessionId) {
    console.log(`🧠 Context already active for browser session: ${browserSessionId.substring(0, 8)}...`);
    return NextResponse.json({
      success: true,
      message: 'Context session already active',
      contextSessionId: session.contextSessionId,
      alreadyActive: true
    });
  }

  // LAZY CONTEXT ACTIVATION: Create context session now (when AI features needed)
  try {
    console.log(`🧠 Activating context for browser session: ${browserSessionId.substring(0, 8)}...`);

    // 1. Initialize database
    await contextDatabase.initialize();
    
    // 2. Initialize context processor
    await contextProcessor.initialize(projectPath);
    
    // 3. Start file watcher
    await contextFileWatcher.watchProject(projectPath);
    
    // 4. Get the created session ID
    const stats = await contextProcessor.getStats();
    const contextSessionId = stats.currentSession || `session_${Date.now()}_${browserSessionId.substring(-6)}`;
    
    // 5. Link to browser session
    session.contextSessionId = contextSessionId;
    session.lastActivity = Date.now();
    activeBrowserSessions.set(browserSessionId, session);

    console.log(`✅ Context session activated: ${contextSessionId.substring(0, 8)}... for browser session ${browserSessionId.substring(0, 8)}...`);

    return NextResponse.json({
      success: true,
      message: 'Context session activated',
      contextSessionId,
      stats: {
        currentSession: stats.currentSession,
        totalConversations: stats.totalConversations,
        totalSessions: stats.totalSessions,
        totalPatterns: stats.totalPatterns
      }
    });

  } catch (error) {
    console.error('Context activation failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to activate context session',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function handleContextDeactivation(browserSessionId: string): Promise<NextResponse> {
  const session = activeBrowserSessions.get(browserSessionId);
  if (!session) {
    return NextResponse.json({ 
      success: false, 
      error: 'Browser session not found' 
    }, { status: 404 });
  }

  if (!session.contextSessionId) {
    return NextResponse.json({
      success: true,
      message: 'No context session to deactivate',
      alreadyInactive: true
    });
  }

  // Remove context session link
  const contextSessionId = session.contextSessionId;
  delete session.contextSessionId;
  session.lastActivity = Date.now();
  activeBrowserSessions.set(browserSessionId, session);

  console.log(`🧠 Context session deactivated: ${contextSessionId.substring(0, 8)}... for browser session ${browserSessionId.substring(0, 8)}...`);

  return NextResponse.json({
    success: true,
    message: 'Context session deactivated',
    previousContextSessionId: contextSessionId
  });
}

/**
 * Cleanup inactive browser sessions (to be called periodically)
 */
setInterval(() => {
  const now = Date.now();
  const INACTIVE_THRESHOLD = 60 * 60 * 1000; // 1 hour

  let cleaned = 0;
  for (const [sessionId, session] of activeBrowserSessions.entries()) {
    if (now - session.lastActivity > INACTIVE_THRESHOLD) {
      activeBrowserSessions.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} inactive browser sessions`);
  }
}, 30 * 60 * 1000); // Run every 30 minutes