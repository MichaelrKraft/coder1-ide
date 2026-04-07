import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getRun, getRunLogChunks, getRunThoughts } from '@/lib/agent-hub/runs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const run = getRun(id, userId);
    if (!run) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const logChunks = getRunLogChunks(id);
    const thoughts = getRunThoughts(id);
    return NextResponse.json({ run, logChunks, thoughts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/agent-hub/runs/[id]] GET error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
