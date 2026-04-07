import { NextRequest, NextResponse } from 'next/server';
import { getRun, updateRun } from '@/lib/agent-hub/runs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  let body: { response?: string };
  try {
    body = (await request.json()) as { response?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { response } = body;
  if (!response || typeof response !== 'string' || response.trim().length === 0) {
    return NextResponse.json({ error: 'response is required' }, { status: 400 });
  }

  // Use 'default' userId — matches the relaxed check in getRun
  const run = getRun(id, 'default');
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  if (run.status !== 'needs_human_input') {
    return NextResponse.json(
      { error: `Run is in '${run.status}' status, not 'needs_human_input'` },
      { status: 409 }
    );
  }

  const updated = updateRun(id, run.userId, {
    humanInputResponse: response.trim().slice(0, 2000),
    status: 'cancelled',
  });

  return NextResponse.json({ run: updated });
}
