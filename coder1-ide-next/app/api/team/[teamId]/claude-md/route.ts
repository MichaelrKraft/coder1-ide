import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import { analyzeClaudeMd, hashContent } from '@/lib/claude-md-analysis';
import type { ClaudeMdAssetData, ClaudeMdVersion } from '@/types/claude-md';

export const dynamic = 'force-dynamic';

const ASSET_KEY = 'CLAUDE.md';
const ASSET_TYPE = 'claude_md_version' as const;
const MAX_HISTORY = 10;

// ---------------------------------------------------------------------------
// GET /api/team/[teamId]/claude-md
// Returns the current CLAUDE.md version for a team.
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
): Promise<NextResponse> {
  const { teamId } = params;
  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  try {
    const asset = await teamAssetsService.getByKey<ClaudeMdAssetData>(
      teamId,
      ASSET_TYPE,
      ASSET_KEY
    );

    if (!asset) {
      return NextResponse.json({ version: null });
    }

    const d = asset.data;
    const version: ClaudeMdVersion = {
      id: asset.id,
      teamId,
      content: d.content,
      contentHash: d.contentHash,
      version: d.version,
      tokenCount: d.tokenCount,
      instructionCount: d.instructionCount,
      savedBy: d.savedBy,
      savedByName: d.savedByName,
      changeNote: d.changeNote,
      createdAt: asset.updatedAt,
    };

    return NextResponse.json({ version });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[GET /api/team/[teamId]/claude-md]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/team/[teamId]/claude-md
// Saves a new version of the team's CLAUDE.md.
// Body: { content: string, changeNote?: string, savedByName?: string }
// ---------------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: { teamId: string } }
): Promise<NextResponse> {
  const { teamId } = params;
  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { content, changeNote, savedByName } = body;
  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content must be a string' }, { status: 400 });
  }

  try {
    const contentHash = await hashContent(content);
    const analysis = analyzeClaudeMd(content);
    const savedBy = 'user'; // In a real app this comes from the session/JWT

    // Read current version to preserve history
    const existing = await teamAssetsService.getByKey<ClaudeMdAssetData>(
      teamId,
      ASSET_TYPE,
      ASSET_KEY
    );

    const prevVersions: NonNullable<ClaudeMdAssetData['versions']> =
      existing?.data.versions ?? [];

    // Add current version to history before overwriting
    if (existing) {
      const historyEntry = {
        version: existing.data.version,
        content: existing.data.content,
        contentHash: existing.data.contentHash,
        savedBy: existing.data.savedBy,
        savedByName: existing.data.savedByName,
        changeNote: existing.data.changeNote,
        createdAt: existing.updatedAt,
      };
      prevVersions.unshift(historyEntry);
    }

    // Keep only the last MAX_HISTORY versions
    const trimmedVersions = prevVersions.slice(0, MAX_HISTORY);

    const nextVersion = existing ? existing.data.version + 1 : 1;
    const now = new Date().toISOString();

    const newData: ClaudeMdAssetData = {
      content,
      contentHash,
      version: nextVersion,
      tokenCount: analysis.estimatedTokens,
      instructionCount: analysis.instructionCount,
      savedBy,
      savedByName: typeof savedByName === 'string' ? savedByName : 'Unknown',
      changeNote: typeof changeNote === 'string' ? changeNote : undefined,
      versions: trimmedVersions,
    };

    const asset = await teamAssetsService.upsert<ClaudeMdAssetData>({
      teamId,
      assetType: ASSET_TYPE,
      assetKey: ASSET_KEY,
      data: newData,
      createdBy: savedBy,
      createdByName: typeof savedByName === 'string' ? savedByName : undefined,
      contentHash,
    });

    const version: ClaudeMdVersion = {
      id: asset.id,
      teamId,
      content: newData.content,
      contentHash: newData.contentHash,
      version: newData.version,
      tokenCount: newData.tokenCount,
      instructionCount: newData.instructionCount,
      savedBy: newData.savedBy,
      savedByName: newData.savedByName,
      changeNote: newData.changeNote,
      createdAt: now,
    };

    return NextResponse.json({ version });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[PUT /api/team/[teamId]/claude-md]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
