/**
 * GET /api/team/[teamId]/onboarding/admin
 * Returns onboarding progress for all team members.
 */

import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import { getDefaultMilestones, calculateProgressPercent } from '@/lib/onboarding-milestones';
import type { OnboardingProgressAssetData, TeamOnboardingStatus } from '@/types/onboarding';

export const dynamic = 'force-dynamic';

const ASSET_TYPE = 'onboarding_progress' as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
): Promise<NextResponse> {
  const { teamId } = params;

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  try {
    const assets = await teamAssetsService.list<OnboardingProgressAssetData>(
      teamId,
      ASSET_TYPE
    );

    const members: TeamOnboardingStatus[] = assets.map((asset) => {
      const d = asset.data;
      const milestones = getDefaultMilestones(d.role).map((m) => {
        const saved = d.milestones.find((s) => s.id === m.id);
        return saved ? { ...m, status: saved.status } : m;
      });
      const progressPercent = calculateProgressPercent(milestones);

      return {
        userId: asset.assetKey,
        userName: asset.createdByName ?? asset.assetKey,
        role: d.role,
        progressPercent,
        currentPhase: d.currentPhase,
        startedAt: d.startedAt,
        completedAt: d.completedAt,
      };
    });

    return NextResponse.json({ members });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[GET /api/team/[teamId]/onboarding/admin]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
