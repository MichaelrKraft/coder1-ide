/**
 * Johnny5 Session Detail API
 *
 * GET /api/johnny5/sessions/[sessionId] - Returns REAL detailed session information
 *
 * This endpoint provides full session details including:
 * - All replay steps (for reasoning replay feature)
 * - File changes with line counts
 * - Any errors that occurred
 * - Complete reasoning chain
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5SessionDetail,
} from '@/types/johnny5';
import { getSessionDetail } from '@/services/johnny5/session-tracker';

// Force dynamic rendering - session data changes during active sessions
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Session ID is required',
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get REAL session detail from session tracker
    const session = getSessionDetail(sessionId);

    if (!session) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Session not found: ${sessionId}`,
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: Johnny5APIResponse<Johnny5SessionDetail> = {
      success: true,
      data: session,
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Session Detail API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch session detail',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
