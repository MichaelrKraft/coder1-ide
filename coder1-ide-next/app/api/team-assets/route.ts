import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import type { AssetType } from '@/services/team-assets-service';

export const dynamic = 'force-dynamic';

const VALID_ASSET_TYPES = new Set<AssetType>([
  'slash_command',
  'claude_md_version',
  'agent_template',
  'onboarding_progress',
]);

function isValidAssetType(value: string | null): value is AssetType {
  return value !== null && VALID_ASSET_TYPES.has(value as AssetType);
}

/**
 * GET /api/team-assets?teamId=<id>&assetType=<type>
 *
 * Returns all non-deleted assets for the given team and asset type.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const assetType = searchParams.get('assetType');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  if (!isValidAssetType(assetType)) {
    return NextResponse.json({ error: 'assetType is required and must be valid' }, { status: 400 });
  }

  try {
    const assets = await teamAssetsService.list(teamId, assetType);
    return NextResponse.json({ assets });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/team-assets GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/team-assets
 *
 * Body: { teamId, assetType, assetKey, data, createdBy, createdByName?, contentHash? }
 *
 * Upserts a team asset. Returns the created/updated asset.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { teamId, assetType, assetKey, data, createdBy, createdByName, contentHash } = body;

  if (typeof teamId !== 'string' || !teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }
  if (!isValidAssetType(typeof assetType === 'string' ? assetType : null)) {
    return NextResponse.json({ error: 'assetType is required and must be valid' }, { status: 400 });
  }
  if (typeof assetKey !== 'string' || !assetKey) {
    return NextResponse.json({ error: 'assetKey is required' }, { status: 400 });
  }
  if (data === undefined || data === null) {
    return NextResponse.json({ error: 'data is required' }, { status: 400 });
  }
  if (typeof createdBy !== 'string' || !createdBy) {
    return NextResponse.json({ error: 'createdBy is required' }, { status: 400 });
  }

  try {
    const asset = await teamAssetsService.upsert({
      teamId,
      assetType: assetType as AssetType,
      assetKey,
      data,
      createdBy,
      createdByName: typeof createdByName === 'string' ? createdByName : undefined,
      contentHash: typeof contentHash === 'string' ? contentHash : undefined,
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/team-assets POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/team-assets?teamId=<id>&assetType=<type>&assetKey=<key>
 *
 * Soft-deletes the asset. Requires deletedBy in the query string or falls
 * back to 'unknown' to record who performed the deletion.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const assetType = searchParams.get('assetType');
  const assetKey = searchParams.get('assetKey');
  const deletedBy = searchParams.get('deletedBy') ?? 'unknown';

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }
  if (!isValidAssetType(assetType)) {
    return NextResponse.json({ error: 'assetType is required and must be valid' }, { status: 400 });
  }
  if (!assetKey) {
    return NextResponse.json({ error: 'assetKey is required' }, { status: 400 });
  }

  try {
    const deleted = await teamAssetsService.softDelete(teamId, assetType, assetKey, deletedBy);
    if (!deleted) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/team-assets DELETE]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
