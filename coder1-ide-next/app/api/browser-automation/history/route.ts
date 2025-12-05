/**
 * Browser Automation History API Route
 *
 * Retrieves test execution history
 */

import { NextRequest, NextResponse } from 'next/server';
import { browserAutomationService } from '@/services/browser-automation-service';

/**
 * GET /api/browser-automation/history
 *
 * Fetch test execution history
 *
 * Query parameters:
 * - limit: Number of results to return (default: 50)
 * - status: Filter by status (success|failed|running)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const statusFilter = searchParams.get('status') as 'success' | 'failed' | 'running' | null;

    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Get all test history
    let history = browserAutomationService.getAllTestHistory();

    // Apply status filter if provided
    if (statusFilter) {
      history = history.filter(test => test.status === statusFilter);
    }

    // Apply limit
    history = history.slice(0, limit);

    // Calculate summary statistics
    const stats = {
      total: history.length,
      success: history.filter(t => t.status === 'success').length,
      failed: history.filter(t => t.status === 'failed').length,
      running: history.filter(t => t.status === 'running').length,
      averageDuration: history.length > 0 ?
        Math.round(history.reduce((sum, t) => sum + t.duration, 0) / history.length) :
        0
    };

    return NextResponse.json({
      history: history.map(test => ({
        testId: test.testId,
        status: test.status,
        duration: test.duration,
        actionsCount: test.actions.length,
        screenshotsCount: test.screenshots.length,
        error: test.error,
        // Include first action as a preview
        preview: test.actions[0] ? {
          type: test.actions[0].type,
          description: generateActionDescription(test.actions[0])
        } : null
      })),
      stats,
      meta: {
        returned: history.length,
        limit,
        filter: statusFilter || 'all'
      }
    });

  } catch (error) {
    console.error('History retrieval error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve test history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/browser-automation/history
 *
 * Clear test history (optional: admin/maintenance endpoint)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const confirm = searchParams.get('confirm');

    if (confirm !== 'true') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          message: 'Add ?confirm=true to clear history'
        },
        { status: 400 }
      );
    }

    browserAutomationService.clearHistory();

    return NextResponse.json({
      message: 'Test history cleared successfully',
      cleared: true
    });

  } catch (error) {
    console.error('History clear error:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to generate human-readable action description
 */
function generateActionDescription(action: any): string {
  switch (action.type) {
    case 'navigate':
      return `Navigate to ${action.url}`;
    case 'click':
      return `Click ${action.selector}`;
    case 'fill':
      return `Fill ${action.selector} with "${action.value}"`;
    case 'screenshot':
      return 'Take screenshot';
    case 'hover':
      return `Hover over ${action.selector}`;
    case 'select':
      return `Select "${action.value}" from ${action.selector}`;
    case 'wait':
      return `Wait ${action.timeout}ms`;
    case 'evaluate':
      return 'Execute JavaScript';
    default:
      return action.type;
  }
}
