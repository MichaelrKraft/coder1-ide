/**
 * POST /api/team/[teamId]/onboarding/skip
 * Sets skippedUntil to now + hours (default 24h).
 */

import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import type { OnboardingProgressAssetData } from '@/types/onboarding';

export const dynamic = 'force-dynamic';

const ASSET_TYPE = 'onboarding_progress' as const;

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
): Promise<NextResponse> {
  const { teamId } = params;

  let body: { userId: string; hours?: number };
  try {
    body = await req.json() as { userId: string; hours?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, hours = 24 } = body;
  if (!teamId || !userId) {
    return NextResponse.json({ error: 'teamId and userId are required' }, { status: 400 });
  }

  try {
    const asset = await teamAssetsService.getByKey<OnboardingProgressAssetData>(
      teamId,
      ASSET_TYPE,
      userId
    );

    const skippedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    if (asset) {
      const updatedData: OnboardingProgressAssetData = {
        ...asset.data,
        skippedUntil,
      };

      await teamAssetsService.upsert<OnboardingProgressAssetData>({
        teamId,
        assetType: ASSET_TYPE,
        assetKey: userId,
        data: updatedData,
        createdBy: userId,
      });
    }
    // If no asset exists yet, we don't create one — skip just means "don't show for now"

    return NextResponse.json({ skippedUntil });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[POST /api/team/[teamId]/onboarding/skip]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
