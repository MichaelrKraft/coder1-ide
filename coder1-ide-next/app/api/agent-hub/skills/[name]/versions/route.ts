import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getSkillVersions, rollbackSkillVersion, readSkillVersion } from '@/lib/agent-hub/teaching';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ name: string }>;
}

// GET: List versions for a skill
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { name: skillName } = await context.params;

  try {
    const manifest = getSkillVersions(skillName);
    if (!manifest) {
      return NextResponse.json({ versions: [], current: 0 });
    }
    return NextResponse.json(manifest);
  } catch (error) {
    console.error('[agent-hub] GET /skills/[name]/versions error:', error);
    return NextResponse.json({ error: 'Failed to get skill versions' }, { status: 500 });
  }
}

// POST: Rollback to a specific version
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

  const { version } = body;
  if (typeof version !== 'number' || version < 1) {
    return NextResponse.json({ error: 'version must be a positive number' }, { status: 400 });
  }

  try {
    const content = readSkillVersion(skillName, version);
    if (!content) {
      return NextResponse.json({ error: `Version ${version} not found` }, { status: 404 });
    }

    const success = rollbackSkillVersion(skillName, version);
    if (!success) {
      return NextResponse.json({ error: 'Rollback failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rolledBackTo: version });
  } catch (error) {
    console.error('[agent-hub] POST /skills/[name]/versions error:', error);
    return NextResponse.json({ error: 'Failed to rollback skill' }, { status: 500 });
  }
}
