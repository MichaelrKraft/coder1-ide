import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { saveSkillWithVersion, updateTeachingSession } from '@/lib/agent-hub/teaching';
import { getAgent, updateAgent } from '@/lib/agent-hub/agents';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ name: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { name: skillName } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { content, agentId, sessionId, note } = body;
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }
  if (typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }

  try {
    // Save skill to disk with versioning
    const { version, skillPath } = saveSkillWithVersion(
      skillName,
      content,
      typeof sessionId === 'string' ? sessionId : null,
      typeof note === 'string' ? note : `Created from teaching session`
    );

    // Bind to agent if not already bound
    const agent = getAgent(agentId, userId);
    if (agent && !agent.skills.includes(skillName)) {
      updateAgent(agentId, userId, { skills: [...agent.skills, skillName] });
    }

    // Update teaching session if provided
    if (typeof sessionId === 'string') {
      const now = new Date().toISOString();
      updateTeachingSession(sessionId, userId, {
        status: 'converted',
        skillName,
        skillVersion: version,
        generatedSkillMd: content,
        convertedAt: now,
      });
    }

    return NextResponse.json({ success: true, version, skillPath, skillName });
  } catch (error) {
    console.error('[agent-hub] POST /skills/[name]/save error:', error);
    return NextResponse.json({ error: 'Failed to save skill' }, { status: 500 });
  }
}
