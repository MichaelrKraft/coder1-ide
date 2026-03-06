import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/admin-auth';
import { getAuditLogs, exportAuditLogsCSV } from '@/lib/audit-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const url = request.nextUrl;
    const filters = {
      userId: url.searchParams.get('userId') ?? undefined,
      action: url.searchParams.get('action') ?? undefined,
      startDate: url.searchParams.get('startDate') ?? undefined,
      endDate: url.searchParams.get('endDate') ?? undefined,
    };

    // CSV export when Accept header requests it
    const acceptHeader = request.headers.get('accept') ?? '';
    if (acceptHeader.includes('text/csv')) {
      const csv = exportAuditLogsCSV(filters);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"',
        },
      });
    }

    // JSON with pagination
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;

    const { rows, total } = getAuditLogs({ ...filters, limit, offset });

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Audit Logs] Error:', message);
    return NextResponse.json({ error: 'Failed to fetch audit logs', details: message }, { status: 500 });
  }
}
