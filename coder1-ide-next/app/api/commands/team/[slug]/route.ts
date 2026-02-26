import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import type { TeamAsset } from '@/services/team-assets-service';
import type {
  SlashCommand,
  SlashCommandAssetData,
  SlashCommandVersion,
} from '@/types/slash-command';

export const dynamic = 'force-dynamic';

const MAX_VERSIONS = 10;

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
    isInstalled: false,
    tags: data.tags ?? [],
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

// ============================================================================
// PUT /api/commands/team/[slug]
// ============================================================================

interface UpdateCommandBody {
  teamId: string;
  name?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  argumentsDescription?: string;
  updatedBy?: string;
  updatedByName?: string;
  changeNote?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { slug } = params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    teamId,
    name,
    description,
    content,
    category,
    tags,
    argumentsDescription,
    updatedBy,
    updatedByName,
    changeNote,
  } = body as UpdateCommandBody;

  if (typeof teamId !== 'string' || !teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  try {
    // Fetch existing asset to preserve version history and base fields
    const existing = await teamAssetsService.getByKey<SlashCommandAssetData>(
      teamId,
      'slash_command',
      slug
    );

    if (!existing) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    const existingData = existing.data;

    // Build new version entry from current content before overwriting
    const newVersionEntry: SlashCommandVersion = {
      commandSlug: slug,
      version: existing.version,
      content: existingData.content,
      changedBy: typeof updatedBy === 'string' ? updatedBy : 'unknown',
      changedByName: typeof updatedByName === 'string' ? updatedByName : 'Unknown',
      changeNote: typeof changeNote === 'string' ? changeNote : undefined,
      createdAt: new Date().toISOString(),
    };

    const existingVersions = existingData.versions ?? [];
    const updatedVersions = [newVersionEntry, ...existingVersions].slice(0, MAX_VERSIONS);

    const newContent = typeof content === 'string' ? content : existingData.content;
    const hasArguments = newContent.includes('$ARGUMENTS');

    const updatedData: SlashCommandAssetData = {
      ...existingData,
      name: typeof name === 'string' ? name : existingData.name,
      description: typeof description === 'string' ? description : existingData.description,
      content: newContent,
      category: typeof category === 'string'
        ? (category as SlashCommandAssetData['category'])
        : existingData.category,
      hasArguments,
      argumentsDescription: typeof argumentsDescription === 'string'
        ? argumentsDescription
        : existingData.argumentsDescription,
      tags: Array.isArray(tags) ? tags : existingData.tags,
      version: existing.version + 1,
      versions: updatedVersions,
    };

    const asset = await teamAssetsService.upsert<SlashCommandAssetData>({
      teamId,
      assetType: 'slash_command',
      assetKey: slug,
      data: updatedData,
      createdBy: typeof updatedBy === 'string' ? updatedBy : existingData.createdBy,
      createdByName: typeof updatedByName === 'string' ? updatedByName : existingData.createdByName,
    });

    const command = assetToCommand(asset);
    return NextResponse.json({ command });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/commands/team/[slug] PUT]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/commands/team/[slug]?teamId=<id>
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const deletedBy = searchParams.get('deletedBy') ?? 'unknown';

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  try {
    const deleted = await teamAssetsService.softDelete(
      teamId,
      'slash_command',
      slug,
      deletedBy
    );

    if (!deleted) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/commands/team/[slug] DELETE]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

