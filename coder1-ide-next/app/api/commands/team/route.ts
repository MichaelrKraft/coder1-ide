import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import type { TeamAsset } from '@/services/team-assets-service';
import type { SlashCommand, SlashCommandAssetData } from '@/types/slash-command';

export const dynamic = 'force-dynamic';

const SLUG_REGEX = /^[a-z0-9-]+$/;

// ============================================================================
// Helpers
// ============================================================================

function assetToCommand(asset: TeamAsset<SlashCommandAssetData>): SlashCommand {
  const data = asset.data;
  return {
    id: asset.id,
    teamId: asset.teamId,
    slug: data.slug,
    name: data.name,
    description: data.description,
    content: data.content,
    category: data.category,
    scope: data.scope,
    hasArguments: data.hasArguments,
    argumentsDescription: data.argumentsDescription,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    version: asset.version,
    isInstalled: false, // runtime-only, not persisted
    tags: data.tags ?? [],
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

// ============================================================================
// GET /api/commands/team?teamId=<id>
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  try {
    const assets = await teamAssetsService.list<SlashCommandAssetData>(teamId, 'slash_command');
    const commands = assets.map(assetToCommand);
    return NextResponse.json({ commands });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/commands/team GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================================
// POST /api/commands/team
// ============================================================================

interface CreateCommandBody {
  teamId: string;
  slug: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags?: string[];
  argumentsDescription?: string;
  createdBy?: string;
  createdByName?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    teamId,
    slug,
    name,
    description,
    content,
    category,
    tags,
    argumentsDescription,
    createdBy,
    createdByName,
  } = body as CreateCommandBody;

  if (typeof teamId !== 'string' || !teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }
  if (typeof slug !== 'string' || !SLUG_REGEX.test(slug)) {
    return NextResponse.json(
      { error: 'slug must match /^[a-z0-9-]+$/' },
      { status: 400 }
    );
  }
  if (typeof name !== 'string' || !name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (typeof description !== 'string' || !description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }
  if (typeof content !== 'string' || !content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const hasArguments = content.includes('$ARGUMENTS');

  const data: SlashCommandAssetData = {
    slug,
    name,
    description,
    content,
    category: (typeof category === 'string' ? category : 'general') as SlashCommandAssetData['category'],
    scope: 'team',
    hasArguments,
    argumentsDescription: typeof argumentsDescription === 'string' ? argumentsDescription : undefined,
    tags: Array.isArray(tags) ? tags : [],
    version: 1,
    createdBy: typeof createdBy === 'string' ? createdBy : 'unknown',
    createdByName: typeof createdByName === 'string' ? createdByName : 'Unknown',
  };

  try {
    const asset = await teamAssetsService.upsert<SlashCommandAssetData>({
      teamId,
      assetType: 'slash_command',
      assetKey: slug,
      data,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
    });

    const command = assetToCommand(asset);
    return NextResponse.json({ command }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/commands/team POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
