/**
 * Browser Automation Recording API Route
 *
 * Handles start/stop of browser action recording
 */

import { NextRequest, NextResponse } from 'next/server';
import { browserAutomationService } from '@/services/browser-automation-service';

/**
 * POST /api/browser-automation/record
 *
 * Start recording browser actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      // Generate session ID if not provided
      const generatedId = `rec-${Date.now()}`;
      const session = browserAutomationService.startRecording(generatedId);

      return NextResponse.json({
        sessionId: session.sessionId,
        status: 'recording',
        startTime: session.startTime,
        message: 'Recording started. Perform actions and then stop recording.'
      });
    }

    // Start recording for provided session
    const session = browserAutomationService.startRecording(sessionId);

    return NextResponse.json({
      sessionId: session.sessionId,
      status: 'recording',
      startTime: session.startTime,
      message: 'Recording started'
    });

  } catch (error) {
    console.error('Recording start error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/browser-automation/record?sessionId=xxx
 *
 * Stop recording and return recorded actions
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter is required' },
        { status: 400 }
      );
    }

    const result = browserAutomationService.stopRecording(sessionId);

    if (!result) {
      return NextResponse.json(
        { error: 'Recording session not found or already stopped' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId,
      status: 'stopped',
      actionsRecorded: result.actions.length,
      actions: result.actions,
      playwrightCode: result.playwrightCode,
      message: 'Recording stopped successfully'
    });

  } catch (error) {
    console.error('Recording stop error:', error);
    return NextResponse.json(
      {
        error: 'Failed to stop recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/browser-automation/record?sessionId=xxx
 *
 * Get current recording status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      // Return all active recordings
      const activeCount = browserAutomationService.getActiveRecordingsCount();

      return NextResponse.json({
        activeRecordings: activeCount,
        message: activeCount > 0 ?
          `${activeCount} recording session(s) active` :
          'No active recording sessions'
      });
    }

    // For specific session - note: this is a simplified implementation
    // In production, you'd want to track session state more robustly
    return NextResponse.json({
      sessionId,
      status: 'unknown',
      message: 'Use DELETE to stop recording and retrieve actions'
    });

  } catch (error) {
    console.error('Recording status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get recording status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
