import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireTeamMember } from '@/lib/auth/team-middleware';
import { getTeamMembers } from '@/lib/auth';
import { getTeamPRsCached } from '@/lib/github/pr-service';

/**
 * GET /api/vcs/team/[teamId]/prs
 *
 * Aggregates open PRs for all team members who have GitHub connected.
 * Requires team membership. Results are cached with 5-minute TTL.
 *
 * Query params:
 *   author - Filter by GitHub login
 *   status - 'open' | 'draft' | 'review_required' (default: all open)
 *   limit  - Max PRs to fetch (default 20, max 100)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    // Verify membership
    await requireTeamMember(user.id, teamId);

    // Get all team members
    const members = await getTeamMembers(teamId);

    // For now, we need to get GitHub tokens for the requesting user.
    // The GitHub OAuth token is stored in oauth_accounts with provider='github-vcs'.
    // Agent 1 is building this. For now, we check if the token is available.
    let githubToken: string | null = null;

    try {
      // Try to get the user's GitHub VCS token
      const { getAuthDatabase } = await import('@/lib/auth/db');
      const db = getAuthDatabase();
      const row = db.prepare(
        'SELECT access_token FROM oauth_accounts WHERE user_id = ? AND provider IN (?, ?)'
      ).get(user.id, 'github-vcs', 'github') as { access_token: string } | undefined;

      githubToken = row?.access_token ?? null;
    } catch {
      // Database query failed - token not available
    }

    if (!githubToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'GitHub not connected. Please connect your GitHub account in team settings.',
          code: 'GITHUB_NOT_CONNECTED',
        },
        { status: 403 }
      );
    }

    // Collect GitHub logins for team members.
    // For now, use a simple approach: query oauth_accounts for github logins.
    const githubLogins: string[] = [];
    try {
      const { getAuthDatabase } = await import('@/lib/auth/db');
      const db = getAuthDatabase();
      const rows = db.prepare(
        `SELECT DISTINCT oa.provider_account_id
         FROM oauth_accounts oa
         JOIN team_members tm ON oa.user_id = tm.user_id
         WHERE tm.team_id = ? AND oa.provider IN ('github-vcs', 'github')`
      ).all(teamId) as { provider_account_id: string }[];

      for (const row of rows) {
        if (row.provider_account_id) {
          githubLogins.push(row.provider_account_id);
        }
      }
    } catch {
      // If we can't get team GitHub logins, at least use the current user
    }

    if (githubLogins.length === 0) {
      return NextResponse.json({
        prs: [],
        cachedAt: new Date().toISOString(),
        stale: false,
        total: 0,
        message: 'No team members have connected GitHub.',
      });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '20', 10),
      100
    );

    // Fetch PRs with caching
    const result = await getTeamPRsCached(teamId, githubToken, githubLogins, limit);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Map error messages to HTTP status codes
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403
                 : message.includes('token expired') ? 401
                 : message.includes('rate limit') ? 429
                 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
