import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { FLAGS } from '@/lib/agent-hub/feature-flags';
import { activeMeetings, isMeetingActive, registerMeetingRun } from '@/lib/agent-hub/warroom';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const STANDUP_PROMPT = `You are participating in a team standup. Please provide a brief update covering:
1. What you completed since last standup
2. What you plan to work on next
3. Any blockers or concerns

Keep your response concise (2-4 sentences per point).`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!FLAGS.warRoomEnabled) {
    return NextResponse.json({ error: 'War Room is currently disabled', feature: 'warRoom' }, { status: 503 });
  }

  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (isMeetingActive(userId)) {
    return NextResponse.json({ error: 'A standup is already in progress', feature: 'warRoom' }, { status: 409 });
  }

  const db = getAgentHubDatabase();
  const agents = db.prepare(
    `SELECT id, name FROM agent_hub_agents WHERE user_id = ? AND status != 'archived' ORDER BY created_at ASC`
  ).all(userId) as Array<{ id: string; name: string }>;

  if (agents.length === 0) {
    return NextResponse.json({ error: 'No agents configured' }, { status: 400 });
  }

  const meetingId = uuidv4();
  activeMeetings.set(meetingId, { userId, pendingRunIds: new Set() });

  const internalToken = process.env.AGENT_HUB_INTERNAL_TOKEN;
  const port = process.env.PORT || 3001;
  const runIds: string[] = [];

  for (const agent of agents) {
    try {
      const resp = await fetch(`http://localhost:${port}/api/agent-hub/internal/create-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': internalToken ?? '',
        },
        body: JSON.stringify({
          title: `[War Room] Standup — ${agent.name}`,
          description: STANDUP_PROMPT,
          agentId: agent.id,
          userId,
          autoRun: !!internalToken,
        }),
      });
      if (resp.ok) {
        const body = await resp.json() as { run?: { id: string } };
        if (body.run?.id) {
          registerMeetingRun(meetingId, body.run.id, agent.id, userId);
          runIds.push(body.run.id);
        }
      }
    } catch (e) {
      console.error('[warroom] Failed to start agent', agent.id, e);
    }
  }

  return NextResponse.json({ meetingId, agentCount: agents.length, runIds }, { status: 202 });
}
