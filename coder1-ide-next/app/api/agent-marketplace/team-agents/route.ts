/**
 * GET /api/agent-marketplace/team-agents?teamId=<id>
 * Returns all activated agents for a team.
 */

import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import type { AgentTemplateAssetData } from '@/types/agent-marketplace';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const teamId = request.nextUrl.searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId query param is required' }, { status: 400 });
  }

  try {
    const assets = await teamAssetsService.list<AgentTemplateAssetData>(
      teamId,
      'agent_template'
    );

    const agents = assets.map((a) => a.data);

    return NextResponse.json({ agents });
  } catch (err) {
    console.error('[team-agents] Failed to list team agents:', err);
    return NextResponse.json({ error: 'Failed to load team agents' }, { status: 500 });
  }
}
