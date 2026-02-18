import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireTeamMember, requireTeamAdmin } from '@/lib/auth/team-middleware';
import { getTeamMembers, getTeamById, removeTeamMember } from '@/lib/auth';

/**
 * GET /api/team/[teamId]/members
 * List all team members. Requires team membership.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    await requireTeamMember(user.id, teamId);

    const members = await getTeamMembers(teamId);

    return NextResponse.json({
      success: true,
      data: members.map(m => ({
        id: m.id,
        email: m.email,
        username: m.username,
        role: m.role,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * DELETE /api/team/[teamId]/members
 * Remove a team member. Requires admin. Cannot remove owner.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    // Require admin
    await requireTeamAdmin(user.id, teamId);

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Cannot remove the owner
    const team = await getTeamById(teamId);
    if (team && team.owner_id === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove the team owner' },
        { status: 403 }
      );
    }

    await removeTeamMember(teamId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403
                 : message.includes('Admin') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
