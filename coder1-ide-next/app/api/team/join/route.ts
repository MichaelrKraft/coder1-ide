import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/team-middleware';
import { getTeamInvitationByToken, acceptTeamInvitation, getTeamById } from '@/lib/auth/db';

/**
 * GET /api/team/join?token=...
 * Handle invite links clicked from email — validate and redirect to login with token.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?inviteError=notfound', request.url));
  }

  const invitation = getTeamInvitationByToken(token);

  if (!invitation) {
    return NextResponse.redirect(new URL('/login?inviteError=notfound', request.url));
  }

  if (invitation.status !== 'pending') {
    return NextResponse.redirect(new URL('/login?inviteError=used', request.url));
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/login?inviteError=expired', request.url));
  }

  // Look up team name for the login page display
  const team = getTeamById(invitation.team_id);
  const teamName = team?.name || 'your team';

  return NextResponse.redirect(
    new URL(`/login?invite=${token}&team=${encodeURIComponent(teamName)}`, request.url)
  );
}

/**
 * POST /api/team/join
 * Accept a team invitation using a token.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Check invitation exists
    const invitation = getTeamInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check status and expiry (edge cases E1-5, E3-4)
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Invitation has already been used' },
        { status: 410 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Accept the invitation (adds user as member)
    acceptTeamInvitation(token, user.id);

    return NextResponse.json({
      success: true,
      data: { team_id: invitation.team_id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Invalid or expired') ? 410 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
