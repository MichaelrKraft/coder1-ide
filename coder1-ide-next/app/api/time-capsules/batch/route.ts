import { NextRequest, NextResponse } from 'next/server';
import { features } from '@/lib/feature-flags';
import { batchCheckCapsules } from '@/lib/time-capsule-db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/time-capsules/batch
 * Batch check which commit SHAs have associated Time Capsules.
 * Used by the Git History UI to efficiently show capsule icons.
 *
 * Request body: { repoPath: string, commitShas: string[] }
 * Response: { hasCapsule: { [sha: string]: boolean } }
 */
export async function POST(request: NextRequest) {
  if (!features().timeCapsules) {
    return NextResponse.json(
      { error: 'Time Capsules feature is not enabled' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();

    if (!body.repoPath || !Array.isArray(body.commitShas)) {
      return NextResponse.json(
        { error: 'repoPath (string) and commitShas (string[]) are required' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    const shas = body.commitShas.slice(0, 500);

    const hasCapsule = await batchCheckCapsules(body.repoPath, shas);

    return NextResponse.json({ success: true, hasCapsule });
  } catch (error) {
    console.error('[Time Capsule API] Batch check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
