import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getAuthUser, requireTeamMember } from '@/lib/auth/team-middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/team/[teamId]/voice/token
 * Generate a LiveKit token for joining the team voice room.
 * Requires team membership and ENABLE_VOICE_CALLS feature flag.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    const member = await requireTeamMember(user.id, teamId);

    if (process.env.ENABLE_VOICE_CALLS !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Voice calls are not enabled' },
        { status: 503 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json(
        { success: false, error: 'LiveKit is not configured' },
        { status: 500 }
      );
    }

    const roomName = `coder1-team-${teamId}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `user-${user.id}`,
      name: member.username || 'Team Member',
      ttl: '8h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      token,
      serverUrl,
      roomName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
