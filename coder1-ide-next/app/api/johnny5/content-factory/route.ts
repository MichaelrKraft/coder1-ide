/**
 * Johnny5 Content Factory API
 *
 * POST /api/johnny5/content-factory
 *   Body: { action: 'run-scout' }
 *   Response: { success: true, data: ScoutResult }
 *
 * GET /api/johnny5/content-factory
 *   Response: { success: true, data: { lastRun: string | null, storyCount: number | null } }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse } from '@/types/johnny5';

// Force dynamic rendering — this route calls external APIs and reads env vars
export const dynamic = 'force-dynamic';

type ContentFactoryAction = 'run-scout';

/**
 * POST handler — trigger a Content Factory action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: ContentFactoryAction };

    if (!action) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing required field: action',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    switch (action) {
      case 'run-scout': {
        const { runScout } = await import('@/services/johnny5/content-factory/scout-service');

        console.log('[ContentFactory API] Triggering Scout run...');
        const scoutResult = await runScout();

        const response: Johnny5APIResponse<typeof scoutResult> = {
          success: true,
          data: scoutResult,
          timestamp: new Date(),
        };
        return NextResponse.json(response);
      }

      default: {
        const response: Johnny5APIResponse<null> = {
          success: false,
          error: `Unknown action: "${action}". Valid actions: run-scout`,
          timestamp: new Date(),
        };
        return NextResponse.json(response, { status: 400 });
      }
    }
  } catch (error) {
    console.error('[ContentFactory API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Content Factory action failed',
      timestamp: new Date(),
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET handler — return status and last run info
 */
export async function GET() {
  try {
    const { readLastScoutResult } = await import('@/services/johnny5/content-factory/scout-service');
    const lastResult = readLastScoutResult();

    const response: Johnny5APIResponse<{
      lastRun: string | null;
      storyCount: number | null;
      model: string | null;
    }> = {
      success: true,
      data: {
        lastRun: lastResult?.runAt ?? null,
        storyCount: lastResult?.stories.length ?? null,
        model: lastResult?.model ?? null,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[ContentFactory API] GET Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get Content Factory status',
      timestamp: new Date(),
    };
    return NextResponse.json(response, { status: 500 });
  }
}
