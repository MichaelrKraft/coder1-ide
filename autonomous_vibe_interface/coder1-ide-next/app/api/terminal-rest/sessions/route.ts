import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for terminal sessions
const terminalSessions = new Map();

export async function POST(request: NextRequest) {
  try {
    const { cols, rows } = await request.json();
    
    // Generate a session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Store session info (in production this would connect to a real terminal process)
    terminalSessions.set(sessionId, {
      id: sessionId,
      cols: cols || 80,
      rows: rows || 24,
      createdAt: new Date(),
      isActive: true
    });
    
    console.log(`✅ Terminal session created: ${sessionId}`);
    
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