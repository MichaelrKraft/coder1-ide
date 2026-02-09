import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireTeamAdmin } from '@/lib/auth/team-middleware';
import { createTeamInvitation } from '@/lib/auth/db';

/**
 * POST /api/team/[teamId]/invite
 * Invite a user to the team by email. Requires admin.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    // Require admin or owner
    await requireTeamAdmin(user.id, teamId);

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const invitation = createTeamInvitation(teamId, email.trim(), user.id);

    const inviteLink = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/team/join?token=${invitation.token}`;

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        expires_at: invitation.expires_at,
        invite_link: inviteLink,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403
                 : message.includes('Admin') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
