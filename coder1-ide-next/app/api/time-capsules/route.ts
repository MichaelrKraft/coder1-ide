import { NextRequest, NextResponse } from 'next/server';
import { features } from '@/lib/feature-flags';
import {
  createTimeCapsule,
  getTimeCapsulesByRepo,
} from '@/lib/time-capsule-db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/time-capsules
 * Create a new Time Capsule linking an AI session to a Git commit.
 */
export async function POST(request: NextRequest) {
  // Feature flag gate
  if (!features().timeCapsules) {
    return NextResponse.json(
      { error: 'Time Capsules feature is not enabled' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.repository_path || !body.commit_sha) {
      return NextResponse.json(
        { error: 'repository_path and commit_sha are required' },
        { status: 400 }
      );
    }

    // Validate commit_sha format (7-40 hex chars)
    if (!/^[a-f0-9]{7,40}$/.test(body.commit_sha)) {
      return NextResponse.json(
        { error: 'Invalid commit_sha format' },
        { status: 400 }
      );
    }

    // Truncate transcript if too large (1MB limit)
    let transcript = body.transcript || null;
    if (transcript && typeof transcript === 'string' && transcript.length > 1024 * 1024) {
      console.warn('[Time Capsule API] Truncating oversized transcript');
      transcript = transcript.slice(-1024 * 1024);
    }

    const capsule = await createTimeCapsule({
      user_id: body.user_id,
      team_id: body.team_id,
      repository_path: body.repository_path,
      commit_sha: body.commit_sha,
      commit_message: body.commit_message,
      commit_branch: body.commit_branch,
      agent_name: body.agent_name || 'Claude Code',
      agent_version: body.agent_version,
      session_start_time: body.session_start_time,
      duration_seconds: body.duration_seconds,
      transcript,
      files_read: body.files_read ? JSON.stringify(body.files_read) : null,
      files_written: body.files_written ? JSON.stringify(body.files_written) : null,
      trigger_type: body.trigger_type,
    });

    if (!capsule) {
      return NextResponse.json(
        { error: 'Failed to create Time Capsule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, capsule }, { status: 201 });
  } catch (error) {
    console.error('[Time Capsule API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/time-capsules?repoPath=xxx&limit=50
 * List Time Capsules for a repository.
 */
export async function GET(request: NextRequest) {
  // Feature flag gate
  if (!features().timeCapsules) {
    return NextResponse.json(
      { error: 'Time Capsules feature is not enabled' },
      { status: 404 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const repoPath = searchParams.get('repoPath');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!repoPath) {
      return NextResponse.json(
        { error: 'repoPath query parameter is required' },
        { status: 400 }
      );
    }

    const capsules = await getTimeCapsulesByRepo(repoPath, Math.min(limit, 200));

    return NextResponse.json({ success: true, capsules });
  } catch (error) {
    console.error('[Time Capsule API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
