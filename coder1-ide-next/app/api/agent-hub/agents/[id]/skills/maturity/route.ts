import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getAgent } from '@/lib/agent-hub/agents';
import { listTeachingSessions, getSkillMaturity } from '@/lib/agent-hub/teaching';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: agentId } = await context.params;

  try {
    const agent = getAgent(agentId, userId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get all converted teaching sessions to find taught skills
    const sessions = listTeachingSessions(agentId, userId);
    const taughtSkills = new Map<string, ReturnType<typeof getSkillMaturity>>();

    for (const session of sessions) {
      if (session.status === 'converted' && session.skillName && !taughtSkills.has(session.skillName)) {
        taughtSkills.set(session.skillName, getSkillMaturity(session.skillName, agentId, userId));
      }
    }

    // Build maturity map for all agent skills
    const maturityMap: Record<string, { taught: boolean; maturity?: ReturnType<typeof getSkillMaturity> }> = {};
    for (const skill of agent.skills) {
      const taught = taughtSkills.get(skill);
      maturityMap[skill] = taught
        ? { taught: true, maturity: taught }
        : { taught: false };
    }

    return NextResponse.json({ maturity: maturityMap });
  } catch (error) {
    console.error('[agent-hub] GET /agents/[id]/skills/maturity error:', error);
    return NextResponse.json({ error: 'Failed to get skill maturity' }, { status: 500 });
  }
}
