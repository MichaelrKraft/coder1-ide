/**
 * PUT /api/team/[teamId]/onboarding/milestone/[milestoneId]
 * Updates a single milestone status and recalculates progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import { getDefaultMilestones, calculateProgressPercent } from '@/lib/onboarding-milestones';
import type {
  OnboardingProgressAssetData,
  OnboardingSession,
  OnboardingMilestone,
  MilestoneStatus,
} from '@/types/onboarding';

export const dynamic = 'force-dynamic';

const ASSET_TYPE = 'onboarding_progress' as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: { teamId: string; milestoneId: string } }
): Promise<NextResponse> {
  const { teamId, milestoneId } = params;

  let body: { status: 'completed' | 'skipped'; userId: string };
  try {
    body = await req.json() as { status: 'completed' | 'skipped'; userId: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status, userId } = body;
  if (!teamId || !milestoneId || !userId || !status) {
    return NextResponse.json(
      { error: 'teamId, milestoneId, userId, and status are required' },
      { status: 400 }
    );
  }

  try {
    const asset = await teamAssetsService.getByKey<OnboardingProgressAssetData>(
      teamId,
      ASSET_TYPE,
      userId
    );

    if (!asset) {
      return NextResponse.json({ error: 'Onboarding session not found' }, { status: 404 });
    }

    const d = asset.data;
    const now = new Date().toISOString();

    // Update milestone status
    const updatedMilestoneStates = d.milestones.map((m) =>
      m.id === milestoneId
        ? { ...m, status: status as MilestoneStatus, completedAt: now }
        : m
    );

    // Rebuild full milestone list with statuses applied
    const fullMilestones: OnboardingMilestone[] = getDefaultMilestones(d.role).map((m) => {
      const saved = updatedMilestoneStates.find((s) => s.id === m.id);
      return saved
        ? { ...m, status: saved.status, completedAt: saved.completedAt }
        : m;
    });

    const progressPercent = calculateProgressPercent(fullMilestones);

    // Determine if all done → mark completed
    const allDone = fullMilestones.every(
      (m) => m.status === 'completed' || m.status === 'skipped'
    );

    const updatedData: OnboardingProgressAssetData = {
      ...d,
      milestones: updatedMilestoneStates,
      completedAt: allDone ? now : d.completedAt,
    };

    await teamAssetsService.upsert<OnboardingProgressAssetData>({
      teamId,
      assetType: ASSET_TYPE,
      assetKey: userId,
      data: updatedData,
      createdBy: userId,
    });

    const session: OnboardingSession = {
      teamId,
      userId,
      role: d.role,
      currentPhase: d.currentPhase,
      milestones: fullMilestones,
      teamContext: d.teamContext,
      progressPercent,
      startedAt: d.startedAt,
      lastActiveAt: now,
      completedAt: updatedData.completedAt,
    };

    return NextResponse.json({ session });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[PUT /api/team/[teamId]/onboarding/milestone/[milestoneId]]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
