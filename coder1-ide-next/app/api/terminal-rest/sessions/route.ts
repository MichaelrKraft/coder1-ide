import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_BACKEND_URL = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3000';

// Simple in-memory store for terminal sessions (fallback)
const terminalSessions = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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
        console.log(`✅ Terminal session created via Express: ${data.sessionId}`);
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn('Failed to connect to Express backend, using fallback:', backendError);
    }
    
    // Fallback to local implementation if Express is unavailable
    const { cols, rows } = body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    terminalSessions.set(sessionId, {
      id: sessionId,
      cols: cols || 80,
      rows: rows || 24,
      createdAt: new Date(),
      isActive: true
    });
    
    console.log(`✅ Terminal session created (fallback): ${sessionId}`);
    
    return NextResponse.json({
      sessionId,
      status: 'created',
      cols,
      rows
    });
    
  } catch (error) {
    console.error('Error creating terminal session:', error);
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
      console.log(`✅ Terminal session deleted: ${sessionId}`);
      
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
    console.error('Error deleting terminal session:', error);
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
    console.error('Error getting terminal sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get terminal sessions' },
      { status: 500 }
    );
  }
}