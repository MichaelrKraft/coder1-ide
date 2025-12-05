/**
 * Browser Automation Execute API Route
 *
 * Handles execution of browser tests via natural language or Playwright code
 */

import { NextRequest, NextResponse } from 'next/server';
import { browserAutomationService } from '@/services/browser-automation-service';

interface ExecuteRequest {
  command: string;
  mode: 'natural-language' | 'playwright-code';
  sessionId?: string;
}

/**
 * POST /api/browser-automation/execute
 *
 * Execute a browser automation test
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json();
    const { command, mode, sessionId } = body;

    if (!command) {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    // Generate unique test ID
    const testId = browserAutomationService.generateTestId();

    // Parse command to actions
    let actions;
    if (mode === 'natural-language') {
      actions = browserAutomationService.parseNaturalLanguage(command);

      if (actions.length === 0) {
        return NextResponse.json(
          {
            error: 'Could not parse command. Try being more specific.',
            suggestions: [
              'Example: "Go to google.com"',
              'Example: "Click the login button"',
              'Example: "Fill email with test@example.com"',
              'Example: "Take a screenshot"'
            ]
          },
          { status: 400 }
        );
      }
    } else {
      // For playwright-code mode, parse the code (simplified for now)
      // In a real implementation, you'd parse the Playwright code
      actions = [];
    }

    // Execute the test
    const result = await browserAutomationService.executeTest(testId, actions);

    // If recording, add to session
    if (sessionId) {
      for (const action of actions) {
        browserAutomationService.recordAction(sessionId, action);
      }
    }

    return NextResponse.json({
      testId: result.testId,
      status: result.status,
      results: {
        duration: result.duration,
        actions: result.actions,
        screenshots: result.screenshots,
        playwrightCode: result.playwrightCode
      },
      recording: sessionId ? {
        sessionId,
        actionsRecorded: actions.length
      } : undefined
    });

  } catch (error) {
    console.error('Browser automation execute error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute browser automation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/browser-automation/execute?testId=xxx
 *
 * Get status of a running test
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testId = searchParams.get('testId');

    if (!testId) {
      return NextResponse.json(
        { error: 'testId parameter is required' },
        { status: 400 }
      );
    }

    const result = browserAutomationService.getTestResults(testId);

    if (!result) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      testId: result.testId,
      status: result.status,
      results: {
        duration: result.duration,
        actions: result.actions,
        screenshots: result.screenshots,
        error: result.error,
        playwrightCode: result.playwrightCode
      }
    });

  } catch (error) {
    console.error('Browser automation status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get test status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
