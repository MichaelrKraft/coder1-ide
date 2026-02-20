import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireTeamMember } from '@/lib/auth/team-middleware';
import { getCodeOwnership } from '@/lib/github/codeowners-service';

/**
 * GET /api/vcs/team/[teamId]/ownership?path=<filePath>&owner=<repoOwner>&repo=<repoName>
 *
 * Returns code ownership information for a specific file path.
 * Uses CODEOWNERS file as primary source, falls back to git blame.
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

    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!filePath || !owner || !repo) {
      return NextResponse.json(
        { success: false, error: 'Missing required params: path, owner, repo' },
        { status: 400 }
      );
    }

    // Get the user's GitHub token
    let githubToken: string | null = null;
    try {
      const { getAuthDatabase } = await import('@/lib/auth/db');
      const db = getAuthDatabase();
      const row = db.prepare(
        'SELECT access_token FROM oauth_accounts WHERE user_id = ? AND provider IN (?, ?)'
      ).get(user.id, 'github-vcs', 'github') as { access_token: string } | undefined;
      githubToken = row?.access_token ?? null;
    } catch {
      // Token not available
    }

    if (!githubToken) {
      return NextResponse.json(
        { success: false, error: 'GitHub not connected', code: 'GITHUB_NOT_CONNECTED' },
        { status: 403 }
      );
    }

    // Get team member GitHub logins for cross-referencing
    const teamMemberLogins: string[] = [];
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
          teamMemberLogins.push(row.provider_account_id);
        }
      }
    } catch {
      // Fall through
    }

    const ownership = await getCodeOwnership(
      githubToken,
      owner,
      repo,
      filePath,
      teamMemberLogins,
    );

    return NextResponse.json({ ownership });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403
                 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
