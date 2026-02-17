import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireTeamMember, requireTeamAdmin } from '@/lib/auth/team-middleware';
import { getTeamById, getTeamMembers, deleteTeam } from '@/lib/auth/db';

/**
 * GET /api/team/[teamId]
 * Get team details including members. Requires team membership.
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

    const team = getTeamById(teamId);
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    const members = getTeamMembers(teamId);

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        members: members.map(m => ({
          id: m.id,
          email: m.email,
          username: m.username,
          role: m.role,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * DELETE /api/team/[teamId]
 * Delete a team. Requires admin or owner role.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    // Verify admin or owner role
    await requireTeamAdmin(user.id, teamId);

    const team = getTeamById(teamId);
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Delete the team and all related data
    deleteTeam(teamId);

    return NextResponse.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403
                 : message.includes('Admin access required') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
