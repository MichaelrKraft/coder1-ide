/**
 * POST /api/agent-marketplace/activate
 * body: { templateId, teamId, activatedByName? }
 *
 * Activates an agent by:
 * 1. Looking up the template (built-in or team custom)
 * 2. Upserting to team_assets
 * 3. Writing the agent JSON to .coder1/agents/<templateId>.json
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadBuiltInAgentTemplates } from '@/lib/agent-marketplace-loader';
import { teamAssetsService } from '@/services/team-assets-service';
import type { AgentTemplateAssetData } from '@/types/agent-marketplace';
import type { AgentDefinition } from '@/services/ai-agent-orchestrator';

interface ActivateRequestBody {
  templateId: string;
  teamId: string;
  activatedByName?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ActivateRequestBody;
  try {
    body = (await request.json()) as ActivateRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { templateId, teamId, activatedByName = 'Unknown' } = body;

  if (!templateId || !teamId) {
    return NextResponse.json(
      { error: 'templateId and teamId are required' },
      { status: 400 }
    );
  }

  // Find template in built-ins
  const builtIns = loadBuiltInAgentTemplates();
  const template = builtIns.find((t) => t.id === templateId);

  if (!template) {
    return NextResponse.json(
      { error: `Template '${templateId}' not found` },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  // Upsert to team_assets
  const assetData: AgentTemplateAssetData = {
    templateId,
    agentConfig: template.agentConfig,
    permissionLevel: template.permissionLevel,
    activatedBy: 'user',
    activatedByName,
    activatedAt: now,
    isEnabled: true,
  };

  try {
    await teamAssetsService.upsert<AgentTemplateAssetData>({
      teamId,
      assetType: 'agent_template',
      assetKey: templateId,
      data: assetData,
      createdBy: 'user',
      createdByName: activatedByName,
    });
  } catch (err) {
    console.error('[activate] Failed to upsert team asset:', err);
    return NextResponse.json(
      { error: 'Failed to save activation' },
      { status: 500 }
    );
  }

  // Write agent JSON to .coder1/agents/<templateId>.json
  // The AgentDefinition format expected by ai-agent-orchestrator.ts:
  // { name, description, color, model, instructions, tools, templates }
  const agentDef: AgentDefinition = {
    name: template.agentConfig.name,
    description: template.agentConfig.description,
    color: template.agentConfig.color,
    model: template.agentConfig.model,
    instructions: template.agentConfig.instructions,
    tools: template.agentConfig.tools,
    templates: {},
  };

  const agentsDir = path.join(process.cwd(), '.coder1', 'agents');
  const agentFilePath = path.join(agentsDir, `${templateId}.json`);
  const alreadyExisted = fs.existsSync(agentFilePath);

  try {
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(agentFilePath, JSON.stringify(agentDef, null, 2), 'utf-8');
  } catch (err) {
    console.error('[activate] Failed to write agent file:', err);
    return NextResponse.json(
      { error: 'Failed to write agent file' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    activated: true,
    agentPath: agentFilePath,
    alreadyExisted,
  });
}
