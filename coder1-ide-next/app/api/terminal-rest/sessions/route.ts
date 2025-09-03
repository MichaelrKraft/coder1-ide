import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3000';

// Simple in-memory store for terminal sessions (fallback)
const terminalSessions = new Map();

// 🚨 SERVER-SIDE SESSION DEDUPLICATION SYSTEM
// Prevents multiple session creation requests from creating duplicate sessions
const SESSION_DEDUPLICATION = {
  creatingInstances: new Set<string>(), // Track instances currently creating sessions
  recentSessions: new Map<string, { sessionId: string, createdAt: number }>(), // Recent sessions by instance
  
  // Check if an instance can create a session
  canCreateSession: (instanceId: string) => {
    // Block if already creating
    if (SESSION_DEDUPLICATION.creatingInstances.has(instanceId)) {
      logger.debug('🚫 SERVER DEDUP: Instance already creating session', { instanceId });
      return false;
    }
    
    // Check if instance has recent session (within 10 seconds)
    const recent = SESSION_DEDUPLICATION.recentSessions.get(instanceId);
    if (recent && (Date.now() - recent.createdAt) < 10000) {
      logger.debug('🚫 SERVER DEDUP: Instance has recent session', { 
        instanceId, 
        sessionId: recent.sessionId,
        ageMs: Date.now() - recent.createdAt 
      });
      return false;
    }
    
    return true;
  },
  
  // Mark instance as creating
  startCreating: (instanceId: string) => {
    SESSION_DEDUPLICATION.creatingInstances.add(instanceId);
    logger.debug('🔒 SERVER DEDUP: Started creating for instance', { instanceId });
  },
  
  // Mark session creation complete
  completeCreation: (instanceId: string, sessionId: string) => {
    SESSION_DEDUPLICATION.creatingInstances.delete(instanceId);
    SESSION_DEDUPLICATION.recentSessions.set(instanceId, {
      sessionId,
      createdAt: Date.now()
    });
    logger.debug('✅ SERVER DEDUP: Completed creation for instance', { instanceId, sessionId });
  },
  
  // Mark creation failed
  failCreation: (instanceId: string, error: any) => {
    SESSION_DEDUPLICATION.creatingInstances.delete(instanceId);
    logger.debug('❌ SERVER DEDUP: Failed creation for instance', { instanceId, error: error?.message });
  },
  
  // Get existing session for instance if available
  getExistingSession: (instanceId: string) => {
    const recent = SESSION_DEDUPLICATION.recentSessions.get(instanceId);
    if (recent && (Date.now() - recent.createdAt) < 30000) { // 30 second window
      return recent.sessionId;
    }
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cols, rows, instanceId, strictMode } = body;
    
    logger.debug('📡 SERVER: Terminal session creation request', {
      instanceId,
      strictMode,
      cols,
      rows
    });
    
    // 🚨 SERVER-SIDE DEDUPLICATION CHECK
    if (instanceId) {
      // Check if instance already has a session
      const existingSession = SESSION_DEDUPLICATION.getExistingSession(instanceId);
      if (existingSession) {
        logger.debug('🔄 SERVER DEDUP: Returning existing session', {
          instanceId,
          existingSession
        });
        return NextResponse.json({
          sessionId: existingSession,
          status: 'reused',
          cols,
          rows,
          isReused: true
        });
      }
      
      // Check if we can create a new session
      if (!SESSION_DEDUPLICATION.canCreateSession(instanceId)) {
        logger.debug('🚫 SERVER DEDUP: Blocked duplicate session creation', { instanceId });
        return NextResponse.json(
          { error: 'Duplicate session creation blocked', instanceId },
          { status: 409 } // Conflict status
        );
      }
      
      // Mark as creating
      SESSION_DEDUPLICATION.startCreating(instanceId);
    }
    
    try {
      // Try to proxy to Express backend first
      try {
        const response = await fetch(`${EXPRESS_BACKEND_URL}/api/terminal-rest/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          logger.debug(`✅ Terminal session created via Express: ${data.sessionId}`, { instanceId });
          
          // Mark creation complete
          if (instanceId) {
            SESSION_DEDUPLICATION.completeCreation(instanceId, data.sessionId);
          }
          
          return NextResponse.json(data);
        }
      } catch (backendError) {
        logger.warn('Failed to connect to Express backend, using fallback:', backendError);
      }
      
      // Fallback to local implementation if Express is unavailable
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      terminalSessions.set(sessionId, {
        id: sessionId,
        cols: cols || 80,
        rows: rows || 24,
        createdAt: new Date(),
        isActive: true,
        instanceId: instanceId || 'unknown',
        strictMode: strictMode || false
      });
      
      logger.debug(`✅ Terminal session created (fallback): ${sessionId}`, { instanceId });
      
      // Mark creation complete
      if (instanceId) {
        SESSION_DEDUPLICATION.completeCreation(instanceId, sessionId);
      }
      
      return NextResponse.json({
        sessionId,
        status: 'created',
        cols,
        rows
      });
    } catch (creationError) {
      // Mark creation failed
      if (instanceId) {
        SESSION_DEDUPLICATION.failCreation(instanceId, creationError);
      }
      throw creationError;
    }
    
  } catch (error) {
    logger.error('Error creating terminal session:', error);
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
    
    if (sessionId && terminalSessions.has(sessionId)) {
      terminalSessions.delete(sessionId);
      logger.debug(`✅ Terminal session deleted: ${sessionId}`);
      
      return NextResponse.json({
        sessionId,
        status: 'deleted'
      });
    } else {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    logger.error('Error deleting terminal session:', error);
    return NextResponse.json(
      { error: 'Failed to delete terminal session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const activeSessions = Array.from(terminalSessions.values());
    
    return NextResponse.json({
      sessions: activeSessions,
      count: activeSessions.length
    });
    
  } catch (error) {
    logger.error('Error getting terminal sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get terminal sessions' },
      { status: 500 }
    );
  }
}