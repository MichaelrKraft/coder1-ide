import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { listWarroomTranscript } from '@/lib/agent-hub/db';
import { activeMeetings } from '@/lib/agent-hub/warroom';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const meetingId = request.nextUrl.searchParams.get('meetingId');
  if (!meetingId) {
    return NextResponse.json({ error: 'meetingId is required' }, { status: 400 });
  }

  const since = request.nextUrl.searchParams.get('since') ?? undefined;
  const entries = listWarroomTranscript(meetingId, userId, since);
  const isActive = Array.from(activeMeetings.values()).some(m => m.userId === userId);

  return NextResponse.json({ entries, isActive, meetingId });
}
