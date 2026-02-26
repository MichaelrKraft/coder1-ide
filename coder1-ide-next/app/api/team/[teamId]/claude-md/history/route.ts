import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import type { ClaudeMdAssetData, ClaudeMdVersion } from '@/types/claude-md';

export const dynamic = 'force-dynamic';

const ASSET_KEY = 'CLAUDE.md';
const ASSET_TYPE = 'claude_md_version' as const;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/team/[teamId]/claude-md/history?limit=20
 *
 * Returns past versions stored in the asset's versions[] array.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
): Promise<NextResponse> {
  const { teamId } = params;
  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;

  try {
    const asset = await teamAssetsService.getByKey<ClaudeMdAssetData>(
      teamId,
      ASSET_TYPE,
      ASSET_KEY
    );

    if (!asset) {
      return NextResponse.json({ versions: [] });
    }

    const rawVersions = asset.data.versions ?? [];
    const sliced = rawVersions.slice(0, limit);

    const versions: ClaudeMdVersion[] = sliced.map((v) => ({
      id: `${teamId}-v${v.version}`,
      teamId,
      content: v.content,
      contentHash: v.contentHash,
      version: v.version,
      tokenCount: Math.ceil(v.content.length / 4),
      instructionCount: v.content
        .split('\n')
        .filter((l) => /^[-*•]\s/.test(l) || /^\d+\.\s/.test(l)).length,
      savedBy: v.savedBy,
      savedByName: v.savedByName,
      changeNote: v.changeNote,
      createdAt: v.createdAt,
    }));

    return NextResponse.json({ versions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[GET /api/team/[teamId]/claude-md/history]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
