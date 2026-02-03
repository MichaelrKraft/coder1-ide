/**
 * Johnny5 Morning Brief API
 *
 * GET /api/johnny5/morning-brief - Returns REAL brief generated from actual overnight activity
 *
 * The Morning Brief is the cornerstone of the "I want to wake up every morning
 * and be like 'wow, you got a lot done while I was sleeping'" vision.
 *
 * Brief Structure:
 * - Built Overnight: Features, PRs, skills created
 * - Research Completed: Analysis and findings
 * - Trends Spotted: Industry news, competitor updates
 * - Needs Attention: Items requiring user action
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5MorningBrief,
} from '@/types/johnny5';
import { getBrief } from '@/services/johnny5/morning-brief-generator';

// Force dynamic rendering - briefs change daily
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Determine which date's brief to return
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        const response: Johnny5APIResponse<null> = {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD.',
          timestamp: new Date(),
        };
        return NextResponse.json(response, { status: 400 });
      }
    } else {
      targetDate = new Date();
    }

    // Get REAL brief from morning brief generator (async)
    const brief = await getBrief(targetDate);
    const dateKey = targetDate.toISOString().split('T')[0];

    console.log(`[Johnny5 Morning Brief API] Returning brief for ${dateKey}`);

    const response: Johnny5APIResponse<Johnny5MorningBrief> = {
      success: true,
      data: brief,
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Morning Brief API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch morning brief',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
