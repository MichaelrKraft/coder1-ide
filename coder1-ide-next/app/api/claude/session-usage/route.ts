/**
 * API endpoint to get Claude Code session token usage
 * GET /api/claude/session-usage?cwd=/path/to/project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUsage } from '@/lib/claude-session-monitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cwd = searchParams.get('cwd');

    if (!cwd) {
      return NextResponse.json(
        { error: 'Missing cwd parameter' },
        { status: 400 }
      );
    }

    const usage = getCurrentSessionUsage(cwd);

    if (!usage) {
      return NextResponse.json(
        { error: 'No active Claude Code session found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      usage: {
        input: usage.input,
        output: usage.output,
        total: usage.total,
        cacheCreation: usage.cacheCreation,
        cacheRead: usage.cacheRead
      }
    });
  } catch (error) {
    console.error('Error getting session usage:', error);
    return NextResponse.json(
      { error: 'Failed to get session usage' },
      { status: 500 }
    );
  }
}
