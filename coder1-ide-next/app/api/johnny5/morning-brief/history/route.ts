/**
 * Johnny5 Morning Brief History API
 *
 * GET /api/johnny5/morning-brief/history - Returns REAL list of past briefs
 *
 * Returns a list of available morning briefs with dates for the
 * historical brief selector in the Morning Brief tab.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
} from '@/types/johnny5';
import { getBriefHistory, getBrief } from '@/services/johnny5/morning-brief-generator';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '7', 10);

    // Get REAL brief history from generator
    const history = getBriefHistory(limit);

    // Generate briefs for recent days if history is empty
    if (history.length === 0) {
      // Generate today's brief at minimum (async)
      const today = new Date();
      await getBrief(today);

      // Get updated history
      const updatedHistory = getBriefHistory(limit);

      console.log(`[Johnny5 Morning Brief History API] Returning ${updatedHistory.length} briefs`);

      const response: Johnny5APIResponse<typeof updatedHistory> = {
        success: true,
        data: updatedHistory,
        timestamp: new Date(),
      };

      return NextResponse.json(response);
    }

    console.log(`[Johnny5 Morning Brief History API] Returning ${history.length} briefs`);

    const response: Johnny5APIResponse<typeof history> = {
      success: true,
      data: history,
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Morning Brief History API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch brief history',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
