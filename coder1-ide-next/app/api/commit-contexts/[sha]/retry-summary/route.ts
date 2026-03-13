import { NextRequest, NextResponse } from 'next/server';
import { commitContextService } from '@/services/commit-context-service';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { sha: string } }
) {
  const { sha } = params;
  if (!sha) {
    return NextResponse.json({ error: 'sha is required' }, { status: 400 });
  }

  try {
    await commitContextService.retrySummary(sha);
    return NextResponse.json({ success: true, message: 'Summary re-queued' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('No commit context found')) {
      return NextResponse.json({ error: 'Commit context not found' }, { status: 404 });
    }
    console.error(`[API] POST /api/commit-contexts/${sha}/retry-summary error:`, err);
    return NextResponse.json({ error: 'Failed to retry summary' }, { status: 500 });
  }
}
