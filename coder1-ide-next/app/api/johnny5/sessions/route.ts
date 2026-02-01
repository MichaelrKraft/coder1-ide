/**
 * Johnny5 Sessions API
 *
 * GET /api/johnny5/sessions - Returns REAL list of session summaries
 *
 * This endpoint fetches sessions directly from Johnny5's SQLite database,
 * falling back to local session tracker if the database is not available.
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type {
  Johnny5APIResponse,
  Johnny5PaginatedResponse,
  Johnny5SessionSummary
} from '@/types/johnny5';
import { getSessionSummaries } from '@/services/johnny5/session-tracker';

// Force dynamic rendering - sessions data changes frequently
export const dynamic = 'force-dynamic';

// Johnny5 database path (stored in .manuslive for compatibility)
const JOHNNY5_DB = join(homedir(), '.manuslive', 'memory.sqlite');

/**
 * Fetch sessions directly from Johnny5 SQLite database
 */
function fetchJohnny5Sessions(): Johnny5SessionSummary[] | null {
  try {
    if (!existsSync(JOHNNY5_DB)) {
      console.log('[Johnny5 Sessions API] Johnny5 database not found');
      return null;
    }

    // Query sessions aggregated from messages table (same as Johnny5's getAllSessions)
    const query = `
      SELECT
        session_id,
        user_id,
        channel,
        MIN(created_at) as created_at,
        MAX(created_at) as last_activity,
        COUNT(*) as message_count
      FROM messages
      GROUP BY session_id
      ORDER BY last_activity DESC
      LIMIT 100
    `;

    const result = execSync(`sqlite3 -json "${JOHNNY5_DB}" "${query}"`, {
      encoding: 'utf-8',
      timeout: 5000,
    });

    const rows = JSON.parse(result || '[]');

    return rows.map((row: any) => {
      // Determine session name from session_id
      const parts = row.session_id.split(':');
      const channel = parts[0] || 'unknown';
      const channelName = channel === 'telegram' ? 'Telegram' : channel === 'dashboard' ? 'Dashboard' : channel;
      const sessionName = `${channelName} Session`;

      return {
        id: row.session_id,
        name: sessionName,
        startTime: new Date(row.created_at),
        endTime: undefined, // Sessions from messages don't have explicit end times
        status: 'completed' as const,
        toolCalls: 0, // Not tracked in messages table
        filesModified: [],
        tokensUsed: 0, // Token tracking to be implemented
        thinkingLevel: 'medium' as const,
        duration: Math.round((row.last_activity - row.created_at) / 60000),
        messageCount: row.message_count,
        channel: row.channel,
      };
    });
  } catch (error) {
    console.log('[Johnny5 Sessions API] Error querying Johnny5:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status'); // 'active' | 'completed' | 'error'
    const search = searchParams.get('search');

    // Try to get sessions from Johnny5 database first
    let sessions: Johnny5SessionSummary[] = [];
    const johnny5Sessions = fetchJohnny5Sessions();

    if (johnny5Sessions && johnny5Sessions.length > 0) {
      sessions = johnny5Sessions;
      console.log(`[Johnny5 Sessions API] Loaded ${sessions.length} sessions from Johnny5`);
    } else {
      // Fall back to local session tracker
      sessions = getSessionSummaries({
        status: status as 'active' | 'completed' | 'error' | undefined,
        search: search || undefined,
      });
    }

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
