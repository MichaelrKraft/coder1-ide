import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const EXPRESS_BACKEND_URL = 'http://localhost:3000';

// In-memory timeline storage (in production, use a database)
let timeline: TimelineEvent[] = [];

interface TimelineEvent {
  id: string;
  timestamp: string | number;
  type: 'file_change' | 'terminal_command' | 'checkpoint' | 'error';
  description: string;
  details?: any;
}

export async function GET(request: NextRequest) {
  try {
    // Get sessionId from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    // Fetch all sessions to build a comprehensive timeline
    const sessionsResponse = await fetch(`${EXPRESS_BACKEND_URL}/api/sessions`);
    
    if (!sessionsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }
    
    const { sessions } = await sessionsResponse.json();
    let allCheckpoints: TimelineEvent[] = [];
    
    // If specific sessionId provided, only get checkpoints for that session
    if (sessionId) {
      const checkpointsResponse = await fetch(`${EXPRESS_BACKEND_URL}/api/sessions/${sessionId}/checkpoints`);
      if (checkpointsResponse.ok) {
        const { checkpoints } = await checkpointsResponse.json();
        allCheckpoints = checkpoints.map((cp: any) => ({
          id: cp.id,
          timestamp: cp.timestamp,
          type: 'checkpoint' as const,
          description: cp.name || 'Checkpoint',
          details: {
            sessionId: cp.sessionId,
            description: cp.description,
            data: cp.data,
            metadata: cp.metadata
          }
        }));
      }
    } else {
      // Get checkpoints from all sessions for a complete timeline
      for (const session of sessions.slice(0, 5)) { // Limit to recent 5 sessions
        const checkpointsResponse = await fetch(`${EXPRESS_BACKEND_URL}/api/sessions/${session.id}/checkpoints`);
        if (checkpointsResponse.ok) {
          const { checkpoints } = await checkpointsResponse.json();
          const sessionCheckpoints = checkpoints.map((cp: any) => ({
            id: cp.id,
            timestamp: cp.timestamp,
            type: 'checkpoint' as const,
            description: `${session.name}: ${cp.name || 'Checkpoint'}`,
            details: {
              sessionId: cp.sessionId,
              sessionName: session.name,
              description: cp.description,
              data: cp.data,
              metadata: cp.metadata
            }
          }));
          allCheckpoints = [...allCheckpoints, ...sessionCheckpoints];
        }
      }
    }
    
    // Sort by timestamp (newest first)
    allCheckpoints.sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timeB - timeA;
    });
    
    return NextResponse.json({ 
      success: true,
      events: allCheckpoints.slice(0, 50), // Return last 50 events
      total: allCheckpoints.length
    });
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    
    // Add event to timeline
    const timelineEvent: TimelineEvent = {
      id: `event-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    
    timeline.push(timelineEvent);
    
    // Save to file
    const dataDir = path.join(process.cwd(), 'data');
    const timelineFile = path.join(dataDir, 'timeline.json');
    
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    await fs.writeFile(timelineFile, JSON.stringify(timeline, null, 2));
    
    return NextResponse.json({ 
      success: true,
      event: timelineEvent
    });
  } catch (error) {
    console.error('Failed to add timeline event:', error);
    return NextResponse.json(
      { error: 'Failed to add timeline event' },
      { status: 500 }
    );
  }
}