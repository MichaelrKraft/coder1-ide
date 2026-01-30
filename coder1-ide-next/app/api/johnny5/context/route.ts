/**
 * Johnny5 Context Composition API
 *
 * GET /api/johnny5/context - Returns REAL context window composition data
 *
 * This endpoint provides visibility into how the context window is being used:
 * - Total tokens and limit
 * - Breakdown by category (system, conversation, files, tools)
 * - File-level token counts
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5ContextComposition,
} from '@/types/johnny5';
import { getContextComposition } from '@/services/johnny5/context-tracker';

// Force dynamic rendering - context changes constantly
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get REAL context composition from context tracker
    const contextComposition = getContextComposition();

    const response: Johnny5APIResponse<Johnny5ContextComposition> = {
      success: true,
      data: contextComposition,
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Context API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch context composition',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
