import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { getAuthenticatedUserId } from '@/lib/auth/request-auth';
import { logAudit } from '@/lib/johnny5-db';

export const dynamic = 'force-dynamic';

// Get the correct data directory path (consistent with checkpoint API)
const getDataDirectory = () => {
  const projectRoot = process.cwd();
  return path.join(projectRoot, 'data');
};

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
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Get sessions from both memory and file system
    const memSessions = Array.from(activeSessions.values());
    const fileSessions: Session[] = [];

    // Try to read sessions from file system
    const dataDir = path.join(getDataDirectory(), 'sessions');
    try {
      const sessionDirs = await fs.readdir(dataDir);

      for (const sessionDir of sessionDirs) {
        const metadataPath = path.join(dataDir, sessionDir, 'metadata.json');
        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

          const session: Session = {
            id: metadata.id || sessionDir,
            name: metadata.name,
            description: metadata.description,
            userId: metadata.userId,
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

    // Filter by authenticated userId — only return sessions owned by this user
    // Legacy sessions without userId are included for backward compatibility
    const allSessions = Array.from(sessionMap.values())
      .filter(s => !s.userId || s.userId === userId || s.userId === 'anonymous' || s.userId === 'default')
      .sort((a, b) => {
        const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
        const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
        return timeB - timeA;
      });

    return NextResponse.json({
      success: true,
      sessions: allSessions,
      count: allSessions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, metadata, type = 'general' } = body;
    // userId comes from JWT, never from request body

    const sessionId = `session_${Date.now()}_${randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const session: Session = {
      id: sessionId,
      name: name || `Session ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      description: description || 'Created from Coder1 IDE',
      userId,
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
    const dataDir = getDataDirectory();
    const sessionDir = path.join(dataDir, 'sessions', sessionId);
    
    await fs.mkdir(sessionDir, { recursive: true });
    
    // Save session metadata (includes userId for ownership)
    const sessionMetadata = {
      id: sessionId,
      name: session.name,
      description: session.description,
      userId,
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
    
    return NextResponse.json({
      success: true,
      session
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
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId parameter is required' },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const sessionDir = path.join(getDataDirectory(), 'sessions', sessionId);
    const metadataPath = path.join(sessionDir, 'metadata.json');
    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      if (metadata.userId && metadata.userId !== userId && metadata.userId !== 'anonymous' && metadata.userId !== 'default') {
        // Audit: unauthorized deletion attempt
        logAudit('session_delete_denied', { userId, targetSessionId: sessionId, ownerId: metadata.userId }).catch(() => {});
        return NextResponse.json(
          { success: false, error: 'Not authorized to delete this session' },
          { status: 403 }
        );
      }
    } catch {
      // Metadata doesn't exist — allow deletion (orphaned session)
    }

    // Delete from memory
    if (activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
    }

    // Delete from file system
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist — not an error
    }

    // Audit: session deleted
    logAudit('session_deleted', { userId, sessionId }).catch(() => {});

    return NextResponse.json({
      success: true,
      sessionId,
      status: 'deleted'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}