import { NextRequest, NextResponse } from 'next/server';
import { commitContextService } from '@/services/commit-context-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { sha: string } }
) {
  const { sha } = params;
  if (!sha || sha.length < 7) {
    return NextResponse.json({ error: 'sha is required (min 7 chars)' }, { status: 400 });
  }

  try {
    const context = await commitContextService.getForSha(sha);
    if (!context) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ context });
  } catch (err) {
    console.error(`[API] GET /api/commit-contexts/${sha} error:`, err);
    return NextResponse.json({ error: 'Failed to get commit context' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { sha: string } }
) {
  const { sha } = params;
  if (!sha) {
    return NextResponse.json({ error: 'sha is required' }, { status: 400 });
  }

  try {
    await commitContextService.deleteContext(sha);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[API] DELETE /api/commit-contexts/${sha} error:`, err);
    return NextResponse.json({ error: 'Failed to delete commit context' }, { status: 500 });
  }
}
