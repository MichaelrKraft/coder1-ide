import { NextRequest, NextResponse } from 'next/server';
import { contextProcessor } from '@/services/context-processor';
import { logger } from '@/lib/logger';

// Simple in-memory session tracking for REST API compatibility
const sessionCounter = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate session ID for REST API compatibility
    const { cols, rows } = body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Store minimal session info
    sessionCounter.set(sessionId, {
      id: sessionId,
      cols: cols || 80,
      rows: rows || 24,
      createdAt: new Date(),
      isActive: true,
      type: 'unified-server'
    });
    
    // PHASE 1 FIX: Context processor initialization DISABLED for memory stability
    // - Auto-initializing context for every terminal REST session causes memory exhaustion
    // - Results in 1,673+ sessions created, causing server crashes (exit code 137)
    // PRESERVED: Original code for Phase 2 restoration:
    /*
    try {
      await contextProcessor.initialize('/Users/michaelkraft/autonomous_vibe_interface');
      logger.info(`🧠 Context processor initialized for terminal session: ${sessionId}`);
    } catch (error) {
      logger.warn('Context processor initialization failed:', error);
      // Continue even if context processor fails - terminal should still work
    }
    */
    
    // REMOVED: // REMOVED: console.log(`✅ Terminal session created (unified): ${sessionId}`);
    
    return NextResponse.json({
      sessionId,
      status: 'created',
      cols,
      rows,
      message: 'Terminal managed by unified server via Socket.IO'
    });
    
  } catch (error) {
    // logger?.error('Error creating terminal session:', error);
    return NextResponse.json(
      { error: 'Failed to create terminal session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // DISABLED: Terminal session deletion is handled by unified server in-memory management
  // The context processor calls and REST API cleanup were causing DELETE cascades that
  // overwhelmed the server and caused EMFILE errors. Sessions are now managed entirely
  // by the unified server's automatic cleanup system.
  try {
    const url = new URL(request.url);
    const sessionId = url.pathname.split('/').pop();
    
    logger.info(`Terminal session deletion disabled - managed by unified server: ${sessionId}`);
    
    return NextResponse.json({
      sessionId,
      status: 'deletion-disabled',
      message: 'Terminal session cleanup disabled - managed by unified server memory management',
      note: 'Sessions are automatically cleaned up by the unified server to prevent server crashes'
    });
    
  } catch (error) {
    logger.error('Error in disabled DELETE endpoint:', error);
    return NextResponse.json(
      { error: 'Terminal session deletion disabled for stability' },
      { status: 200 } // Return 200 instead of 500 to prevent cascades
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const activeSessions = Array.from(sessionCounter.values());
    
    return NextResponse.json({
      sessions: activeSessions,
      count: activeSessions.length,
      message: 'Sessions listed, actual terminals managed by unified server via Socket.IO'
    });
    
  } catch (error) {
    // logger?.error('Error getting terminal sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get terminal sessions' },
      { status: 500 }
    );
  }
}