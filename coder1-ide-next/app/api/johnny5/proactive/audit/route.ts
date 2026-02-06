/**
 * Johnny5 Proactive Audit Log API
 *
 * GET /api/johnny5/proactive/audit - Retrieve audit log entries
 * Query params:
 *   - limit: number (default 50, max 200)
 */

import { NextRequest, NextResponse } from 'next/server';
import { opportunityEngine } from '@/services/johnny5/opportunity-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const entries = opportunityEngine.getAuditLog(limit);

    return NextResponse.json({
      success: true,
      data: {
        entries,
        count: entries.length,
        tokensUsedToday: opportunityEngine.getTokensUsed(),
        queueSize: opportunityEngine.getQueueSize(),
      },
    });
  } catch (error) {
    console.error('[Johnny5/Audit] Failed to get audit log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve audit log' },
      { status: 500 }
    );
  }
}
