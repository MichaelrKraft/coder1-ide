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
    
    // Initialize context processor for this terminal session
    try {
      await contextProcessor.initialize('/Users/michaelkraft/autonomous_vibe_interface');
      logger.info(`🧠 Context processor initialized for terminal session: ${sessionId}`);
    } catch (error) {
      logger.warn('Context processor initialization failed:', error);
      // Continue even if context processor fails - terminal should still work
    }
    
    // REMOVED: // REMOVED: console.log(`✅ Terminal session created (unified): ${sessionId}`);
    
    return NextResponse.json({
      sessionId,
      status: 'created',
      cols,
      rows,
      message: 'Terminal managed by unified server via Socket.IO'
    });
    
  } catch (error) {
    logger?.error('Error creating terminal session:', error);
    return NextResponse.json(
      { error: 'Failed to create terminal session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.pathname.split('/').pop();
    
    if (sessionId && sessionCounter.has(sessionId)) {
      // End the context processor session
      try {
        await contextProcessor.endSession(`Terminal session ${sessionId} closed`, 1.0);
        logger.info(`🧠 Context processor session ended for: ${sessionId}`);
      } catch (error) {
        logger.warn('Context processor session end failed:', error);
        // Continue even if context processor fails
      }
      
      sessionCounter.delete(sessionId);
      // REMOVED: // REMOVED: console.log(`✅ Terminal session deleted (unified): ${sessionId}`);
      
      return NextResponse.json({
        sessionId,
        status: 'deleted',
        message: 'Session cleaned up, actual terminal managed by unified server'
      });
    } else {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    logger?.error('Error deleting terminal session:', error);
    return NextResponse.json(
      { error: 'Failed to delete terminal session' },
      { status: 500 }
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
    logger?.error('Error getting terminal sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get terminal sessions' },
      { status: 500 }
    );
  }
}