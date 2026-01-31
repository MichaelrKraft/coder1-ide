/**
 * Johnny5 Security Audit Log API
 *
 * GET /api/johnny5/security/audit - Returns REAL audit log entries
 *
 * This endpoint provides the security audit trail showing:
 * - All file reads/writes
 * - Command executions
 * - API calls
 * - PRs created
 * - Blocked actions
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5PaginatedResponse,
  Johnny5AuditEntry
} from '@/types/johnny5';
import { getAuditLog } from '@/services/johnny5/security-tracker';

// Force dynamic rendering - audit log is constantly updated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const action = searchParams.get('action'); // filter by action type
    const risk = searchParams.get('risk'); // filter by risk level
    const blocked = searchParams.get('blocked'); // 'true' or 'false'
    const sessionId = searchParams.get('sessionId');

    // Get REAL audit entries from security tracker
    const entries = getAuditLog({
      action: action as Johnny5AuditEntry['action'] | undefined,
      risk: risk as Johnny5AuditEntry['risk'] | undefined,
      blocked: blocked === 'true' ? true : blocked === 'false' ? false : undefined,
    });

    // Paginate
    const total = entries.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedEntries = entries.slice(startIndex, startIndex + pageSize);

    const response: Johnny5APIResponse<Johnny5PaginatedResponse<Johnny5AuditEntry>> = {
      success: true,
      data: {
        items: paginatedEntries,
        total,
        page,
        pageSize,
        hasMore: startIndex + pageSize < total
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Security Audit API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit log',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
