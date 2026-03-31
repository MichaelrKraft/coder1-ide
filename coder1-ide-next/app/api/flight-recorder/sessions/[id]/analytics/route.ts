import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getStorage() {
  const { FlightRecorderStorage } = require('@/lib/flight-recorder/storage');
  return FlightRecorderStorage.getInstance();
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const storage = getStorage();

    const session = storage.getSession(id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const eventRows = storage.getEvents({ sessionId: id, limit: 50000 });
    const { computeSessionAnalytics } = require('@/lib/flight-recorder/session-analytics');
    const analytics = computeSessionAnalytics(
      eventRows.map((r: { event: unknown }) => r.event)
    );

    return NextResponse.json({ session, analytics });
  } catch (error) {
    console.error('[flight-recorder] Analytics error:', error);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
