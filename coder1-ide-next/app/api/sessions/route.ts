import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

// Simple session management (unified server implementation)
const activeSessions = new Map();

interface Session {
  id: string;
  name?: string;
  description?: string;
  userId?: string;
  createdAt: string | number;
  updatedAt?: string | number;
  lastActivity?: string;
  status?: 'active' | 'idle' | 'terminated';
  type?: 'terminal' | 'chat' | 'general';
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    // Get sessions from both memory and file system
    const memSessions = Array.from(activeSessions.values());
    const fileSessions: Session[] = [];
    
    // Try to read sessions from file system
    const dataDir = path.join(process.cwd(), 'data', 'sessions');
    try {
      const sessionDirs = await fs.readdir(dataDir);
      
      for (const sessionDir of sessionDirs) {
        const metadataPath = path.join(dataDir, sessionDir, 'metadata.json');
        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          
          // Convert to Session format
          const session: Session = {
            id: metadata.id || sessionDir,
            name: metadata.name,
            description: metadata.description,
            createdAt: new Date(metadata.createdAt).getTime(),
            updatedAt: new Date(metadata.lastUpdated || metadata.createdAt).getTime(),
            metadata: metadata.metadata
          };
          
          fileSessions.push(session);
        } catch {
          // Metadata file doesn't exist, skip
        }
      }
    } catch {
      // Sessions directory doesn't exist yet
    }
    
    // Combine and dedupe sessions (prefer file sessions)
    const sessionMap = new Map<string, Session>();
    memSessions.forEach(s => sessionMap.set(s.id, s));
    fileSessions.forEach(s => sessionMap.set(s.id, s));
    
    const allSessions = Array.from(sessionMap.values()).sort((a, b) => {
      const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
      const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
      return timeB - timeA; // Most recent first
    });
    
    return NextResponse.json({
      success: true,
      sessions: allSessions,
      count: allSessions.length,
      server: 'unified-server',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // logger?.error('❌ [Unified] Sessions GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve sessions'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, metadata, userId, type = 'general' } = body;
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date().toISOString();
    
    const session: Session = {
      id: sessionId,
      name: name || `IDE Session ${new Date().toLocaleString()}`,
      description: description || 'Created from Coder1 IDE',
      userId: userId || 'anonymous',
      createdAt: now,
      updatedAt: now,
      lastActivity: now,
      status: 'active',
      type,
      metadata: metadata || { ide: true, version: '1.0.0' }
    };
    
    // Save to memory
    activeSessions.set(sessionId, session);
    
    // Save to file system for persistence
    const dataDir = path.join(process.cwd(), 'data');
    const sessionDir = path.join(dataDir, 'sessions', sessionId);
    
    await fs.mkdir(sessionDir, { recursive: true });
    
    // Save session metadata
    const sessionMetadata = {
      id: sessionId,
      name: session.name,
      description: session.description,
      createdAt: session.createdAt,
      lastUpdated: session.updatedAt,
      metadata: session.metadata
    };
    
    await fs.writeFile(
      path.join(sessionDir, 'metadata.json'),
      JSON.stringify(sessionMetadata, null, 2)
    );
    
    // Create checkpoints directory
    await fs.mkdir(path.join(sessionDir, 'checkpoints'), { recursive: true });
    
    // REMOVED: // REMOVED: console.log(`✅ [Unified] Session created: ${sessionId} (${type})`);
    
    return NextResponse.json({
      success: true,
      session,
      server: 'unified-server'
    });
    
  } catch (error) {
    // logger?.error('❌ [Unified] Sessions POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create session'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'sessionId parameter is required'
        },
        { status: 400 }
      );
    }
    
    if (activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
      // REMOVED: // REMOVED: console.log(`✅ [Unified] Session deleted: ${sessionId}`);
      
      return NextResponse.json({
        success: true,
        sessionId,
        status: 'deleted'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found'
        },
        { status: 404 }
      );
    }
    
  } catch (error) {
    // logger?.error('❌ [Unified] Sessions DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete session'
      },
      { status: 500 }
    );
  }
}