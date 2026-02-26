/**
 * GET /api/agent-marketplace/templates
 * Query params: teamId?, category?, search?
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadBuiltInAgentTemplates } from '@/lib/agent-marketplace-loader';
import { teamAssetsService } from '@/services/team-assets-service';
import type { AgentMarketplaceTemplate, AgentTemplateAssetData } from '@/types/agent-marketplace';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const teamId = searchParams.get('teamId');
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.toLowerCase();

  // Load built-in templates
  const builtIns = loadBuiltInAgentTemplates();

  // Start with built-ins
  let templates: AgentMarketplaceTemplate[] = [...builtIns];

  // If teamId provided, load team custom templates and mark activation status
  if (teamId) {
    try {
      const teamAssets = await teamAssetsService.list<AgentTemplateAssetData>(
        teamId,
        'agent_template'
      );

      // Build a set of activated template IDs
      const activatedIds = new Set(
        teamAssets.filter((a) => a.data.isEnabled).map((a) => a.assetKey)
      );

      // Mark built-ins as activated or not
      templates = templates.map((t) => {
        const asset = teamAssets.find((a) => a.assetKey === t.id);
        return {
          ...t,
          isActivated: activatedIds.has(t.id),
          activatedAt: asset?.data.activatedAt,
          activatedBy: asset?.data.activatedBy,
        };
      });

      // Add team custom templates
      const customTemplates = teamAssets
        .filter((a) => a.data.isEnabled)
        .filter((a) => !builtIns.some((b) => b.id === a.assetKey))
        .map<AgentMarketplaceTemplate>((a) => ({
          id: a.assetKey,
          name: a.data.agentConfig.name,
          description: a.data.agentConfig.description,
          longDescription: '',
          category: 'custom',
          version: '1.0.0',
          author: a.data.activatedByName,
          isBuiltIn: false,
          isTeamCustom: true,
          agentConfig: a.data.agentConfig,
          permissionLevel: a.data.permissionLevel,
          estimatedTokensPerRun: 5000,
          tags: [],
          isActivated: true,
          activatedAt: a.data.activatedAt,
          activatedBy: a.data.activatedBy,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }));

      templates = [...templates, ...customTemplates];
    } catch (err) {
      console.error('[agent-marketplace/templates] Failed to load team assets:', err);
      // Return built-ins without activation status on error
    }
  }

  // Filter by category
  if (category && category !== 'all' && category !== 'activated') {
    templates = templates.filter((t) => t.category === category);
  }
  if (category === 'activated') {
    templates = templates.filter((t) => t.isActivated);
  }

  // Filter by search text
  if (search) {
    templates = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search))
    );
  }

  return NextResponse.json({ templates });
}
