/**
 * Johnny5 Session Replay API
 *
 * GET /api/johnny5/sessions/[sessionId]/replay - Get replay data for a session
 *
 * Returns step-by-step reasoning replay data for visualizing how Johnny5
 * made decisions during a session.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeDb,
  getSession,
  getMessages,
  type Session,
  type Message
} from '@/lib/johnny5-db';
import type { Johnny5ReplaySession, Johnny5ReplayStep, Johnny5APIResponse } from '@/types/johnny5';

// Force dynamic rendering - session data changes
export const dynamic = 'force-dynamic';

/**
 * Convert messages to replay steps
 */
function messagesToReplaySteps(messages: Message[]): Johnny5ReplayStep[] {
  const steps: Johnny5ReplayStep[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const timestamp = new Date(msg.created_at);

    // Calculate duration based on next message or estimate
    const nextMsg = messages[i + 1];
    const duration = nextMsg
      ? new Date(nextMsg.created_at).getTime() - timestamp.getTime()
      : 1000; // Default 1 second

    if (msg.role === 'user') {
      // User input - triggers thinking
      steps.push({
        id: `${msg.id}-input`,
        timestamp,
        type: 'thinking',
        thinking: `Processing user input: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`,
        duration: Math.min(duration, 5000), // Cap at 5 seconds
        outcome: 'success'
      });
    } else if (msg.role === 'assistant') {
      // Check if this looks like a tool call (simple heuristic)
      const content = msg.content;
      const hasToolCall = content.includes('```') ||
                         content.includes('Running') ||
                         content.includes('Executing') ||
                         content.includes('Reading file') ||
                         content.includes('Writing to');

      if (hasToolCall) {
        // Extract potential tool info from content
        const toolMatch = content.match(/(?:Running|Executing|Reading|Writing|Calling)\s+[`']?(\w+)/i);
        const toolName = toolMatch ? toolMatch[1] : 'tool';

        steps.push({
          id: `${msg.id}-tool`,
          timestamp,
          type: 'tool_call',
          toolName,
          toolInput: { context: content.substring(0, 200) },
          duration: Math.min(duration / 2, 3000),
          outcome: 'success'
        });
      }

      // Decision/response step
      steps.push({
        id: `${msg.id}-decision`,
        timestamp: new Date(timestamp.getTime() + (hasToolCall ? duration / 2 : 0)),
        type: hasToolCall ? 'decision' : 'response',
        thinking: content.length > 500
          ? content.substring(0, 500) + '...'
          : content,
        duration: hasToolCall ? Math.min(duration / 2, 2000) : Math.min(duration, 3000),
        outcome: 'success'
      });
    }
  }

  return steps;
}

/**
 * GET /api/johnny5/sessions/[sessionId]/replay - Get replay data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await initializeDb();

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required',
        timestamp: new Date()
      } as Johnny5APIResponse<null>, { status: 400 });
    }

    // Get session
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found',
        timestamp: new Date()
      } as Johnny5APIResponse<null>, { status: 404 });
    }

    // Get all messages for this session
    const messages = await getMessages(sessionId, 1000); // Up to 1000 messages

    // Convert to replay steps
    const steps = messagesToReplaySteps(messages);

    // Calculate total duration
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

    const replaySession: Johnny5ReplaySession = {
      sessionId,
      steps,
      totalDuration,
      currentPosition: 0,
      isPlaying: false,
      playbackSpeed: 1
    };

    return NextResponse.json({
      success: true,
      data: replaySession,
      timestamp: new Date()
    } as Johnny5APIResponse<Johnny5ReplaySession>);

  } catch (error) {
    console.error('[Johnny5 Session Replay API] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get replay data',
      timestamp: new Date()
    } as Johnny5APIResponse<null>, { status: 500 });
  }
}
