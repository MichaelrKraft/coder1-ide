/**
 * GET  /api/team/[teamId]/onboarding  — fetch current onboarding session for userId
 * POST /api/team/[teamId]/onboarding  — create a new onboarding session
 */

import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import { getDefaultMilestones, calculateProgressPercent } from '@/lib/onboarding-milestones';
import type {
  OnboardingSession,
  OnboardingProgressAssetData,
  OnboardingRole,
  OnboardingMilestone,
} from '@/types/onboarding';

export const dynamic = 'force-dynamic';

const ASSET_TYPE = 'onboarding_progress' as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSession(
  teamId: string,
  userId: string,
  asset: { assetKey: string; createdByName: string | null; data: OnboardingProgressAssetData }
): OnboardingSession {
  const d = asset.data;

  const milestones: OnboardingMilestone[] = getDefaultMilestones(d.role).map((m) => {
    const saved = d.milestones.find((s) => s.id === m.id);
    return saved
      ? { ...m, status: saved.status, completedAt: saved.completedAt }
      : m;
  });

  const progressPercent = calculateProgressPercent(milestones);

  return {
    teamId,
    userId,
    role: d.role,
    currentPhase: d.currentPhase,
    milestones,
    teamContext: d.teamContext,
    progressPercent,
    startedAt: d.startedAt,
    lastActiveAt: new Date().toISOString(),
    completedAt: d.completedAt,
  };
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
): Promise<NextResponse> {
  const { teamId } = params;
  const userId = req.nextUrl.searchParams.get('userId');

  if (!teamId || !userId) {
    return NextResponse.json(
      { error: 'teamId and userId are required' },
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
      return NextResponse.json({ session: null });
    }

    const session = buildSession(teamId, userId, {
      assetKey: asset.assetKey,
      createdByName: asset.createdByName,
      data: asset.data,
    });

    return NextResponse.json({ session });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[GET /api/team/[teamId]/onboarding]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create new session
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
): Promise<NextResponse> {
  const { teamId } = params;

  let body: { role: OnboardingRole; userId: string; userName?: string };
  try {
    body = await req.json() as { role: OnboardingRole; userId: string; userName?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { role, userId, userName } = body;
  if (!teamId || !userId || !role) {
    return NextResponse.json(
      { error: 'teamId, userId, and role are required' },
      { status: 400 }
    );
  }

  try {
    // Fetch CLAUDE.md content
    let claudeMdContent = '';
    try {
      const claudeMdRes = await fetch(
        `${req.nextUrl.origin}/api/team/${teamId}/claude-md`
      );
      if (claudeMdRes.ok) {
        const claudeMdData = await claudeMdRes.json() as { version?: { content?: string } };
        claudeMdContent = claudeMdData?.version?.content ?? '';
      }
    } catch {
      // non-fatal — onboarding can proceed without CLAUDE.md
    }

    // Fetch team commands
    let teamCommands: string[] = [];
    try {
      const commandAssets = await teamAssetsService.list<{ name: string }>(
        teamId,
        'slash_command'
      );
      teamCommands = commandAssets
        .map((a) => a.data?.name ?? a.assetKey)
        .slice(0, 5);
    } catch {
      // non-fatal
    }

    // Fetch active agents
    let activeAgents: string[] = [];
    try {
      const agentAssets = await teamAssetsService.list<{ name: string }>(
        teamId,
        'agent_template'
      );
      activeAgents = agentAssets.map((a) => a.data?.name ?? a.assetKey);
    } catch {
      // non-fatal
    }

    const now = new Date().toISOString();
    const milestones = getDefaultMilestones(role);

    const assetData: OnboardingProgressAssetData = {
      role,
      currentPhase: 'architecture',
      milestones: milestones.map((m) => ({ id: m.id, status: m.status })),
      teamContext: {
        techStack: '',
        projectDescription: '',
        teamCommands,
        activeAgents,
        claudeMdContent,
      },
      startedAt: now,
    };

    await teamAssetsService.upsert<OnboardingProgressAssetData>({
      teamId,
      assetType: ASSET_TYPE,
      assetKey: userId,
      data: assetData,
      createdBy: userId,
      createdByName: userName,
    });

    const session = buildSession(teamId, userId, {
      assetKey: userId,
      createdByName: userName ?? null,
      data: assetData,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[POST /api/team/[teamId]/onboarding]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
