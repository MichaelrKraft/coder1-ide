import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '@/lib/agent-hub/runs';
import { stopAgentRun } from '@/lib/agent-hub/bridge-integration';
import { getAgent } from '@/lib/agent-hub/agents';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: runId } = await params;

  const run = getRun(runId, userId);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const agent = getAgent(run.agentId, userId);
  const workspacePath = agent?.workspacePath ?? '';

  const sent = await stopAgentRun(runId, userId, workspacePath);

  if (!sent) {
    return NextResponse.json(
      { error: 'No bridge connected — stop signal could not be delivered' },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, message: 'Stop signal sent' });
}
