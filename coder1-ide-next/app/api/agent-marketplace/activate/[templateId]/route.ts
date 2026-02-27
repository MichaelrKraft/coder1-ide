/**
 * DELETE /api/agent-marketplace/activate/[templateId]?teamId=<id>
 *
 * Deactivates an agent by:
 * 1. Soft-deleting from team_assets
 * 2. Removing the .coder1/agents/<templateId>.json file
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { teamAssetsService } from '@/services/team-assets-service';

interface RouteParams {
  params: { templateId: string };
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { templateId } = params;
  const teamId = request.nextUrl.searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId query param is required' }, { status: 400 });
  }

  // Soft-delete from team_assets
  try {
    await teamAssetsService.softDelete(teamId, 'agent_template', templateId, 'user');
  } catch (err) {
    console.error('[deactivate] Failed to soft-delete team asset:', err);
    return NextResponse.json({ error: 'Failed to deactivate agent' }, { status: 500 });
  }

  // Remove the .coder1/agents/<templateId>.json file if it exists
  const agentFilePath = path.join(process.cwd(), '.coder1', 'agents', `${templateId}.json`);
  if (fs.existsSync(agentFilePath)) {
    try {
      fs.unlinkSync(agentFilePath);
    } catch (err) {
      console.warn('[deactivate] Failed to remove agent file:', err);
      // Non-fatal — asset is already deactivated in DB
    }
  }

  return NextResponse.json({ deactivated: true });
}
