/**
 * POST /api/agent-marketplace/custom
 * body: { teamId, agentConfig, permissionLevel, name, description, category, tags?, longDescription? }
 *
 * Creates a custom agent template stored in team_assets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import type {
  AgentMarketplaceTemplate,
  AgentTemplateAssetData,
  AgentCategory,
  AgentPermissionLevel,
} from '@/types/agent-marketplace';

interface CustomAgentRequestBody {
  teamId: string;
  name: string;
  description: string;
  longDescription?: string;
  category: AgentCategory;
  agentConfig: AgentMarketplaceTemplate['agentConfig'];
  permissionLevel: AgentPermissionLevel;
  tags?: string[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: CustomAgentRequestBody;
  try {
    body = (await request.json()) as CustomAgentRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    teamId,
    name,
    description,
    longDescription = '',
    category,
    agentConfig,
    permissionLevel,
    tags = [],
  } = body;

  if (!teamId || !name || !agentConfig) {
    return NextResponse.json(
      { error: 'teamId, name, and agentConfig are required' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const id = `custom-${slugify(name)}-${Date.now()}`;

  const assetData: AgentTemplateAssetData = {
    templateId: id,
    agentConfig,
    permissionLevel,
    activatedBy: 'user',
    activatedByName: 'User',
    activatedAt: now,
    isEnabled: true,
  };

  try {
    await teamAssetsService.upsert<AgentTemplateAssetData>({
      teamId,
      assetType: 'agent_template',
      assetKey: id,
      data: assetData,
      createdBy: 'user',
      createdByName: 'User',
    });
  } catch (err) {
    console.error('[custom] Failed to upsert custom agent:', err);
    return NextResponse.json({ error: 'Failed to create custom agent' }, { status: 500 });
  }

  const template: AgentMarketplaceTemplate = {
    id,
    name,
    description,
    longDescription,
    category,
    version: '1.0.0',
    author: 'Team',
    isBuiltIn: false,
    isTeamCustom: true,
    agentConfig,
    permissionLevel,
    estimatedTokensPerRun: 5000,
    tags,
    isActivated: true,
    activatedAt: now,
    activatedBy: 'user',
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json({ template });
}
