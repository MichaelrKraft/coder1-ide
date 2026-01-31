/**
 * Johnny5 Sessions API
 *
 * GET /api/johnny5/sessions - Returns REAL list of session summaries
 *
 * This endpoint provides session intelligence data showing all
 * Johnny5's work sessions with summary metrics from the session tracker.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5PaginatedResponse,
  Johnny5SessionSummary
} from '@/types/johnny5';
import { getSessionSummaries } from '@/services/johnny5/session-tracker';

// Force dynamic rendering - sessions data changes frequently
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status'); // 'active' | 'completed' | 'error'
    const search = searchParams.get('search');

    // Get REAL sessions from session tracker
    const sessions = getSessionSummaries({
      status: status as 'active' | 'completed' | 'error' | undefined,
      search: search || undefined,
    });

    // Paginate
    const total = sessions.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedSessions = sessions.slice(startIndex, startIndex + pageSize);

    const response: Johnny5APIResponse<Johnny5PaginatedResponse<Johnny5SessionSummary>> = {
      success: true,
      data: {
        items: paginatedSessions,
        total,
        page,
        pageSize,
        hasMore: startIndex + pageSize < total
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Sessions API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sessions',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
