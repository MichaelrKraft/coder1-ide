import { NextResponse } from 'next/server';
import type { FlightEventType } from '@/lib/flight-recorder/types';

export const dynamic = 'force-dynamic';

function getStorage() {
  const { FlightRecorderStorage } = require('@/lib/flight-recorder/storage');
  return FlightRecorderStorage.getInstance();
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const startTimestamp = searchParams.get('start')
      ? parseInt(searchParams.get('start')!, 10) : undefined;
    const endTimestamp = searchParams.get('end')
      ? parseInt(searchParams.get('end')!, 10) : undefined;
    const typesParam = searchParams.get('types');
    const eventTypes = typesParam
      ? typesParam.split(',') as FlightEventType[] : undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search');

    const storage = getStorage();

    // Verify session exists
    const session = storage.getSession(id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If search query, use FTS within session
    if (search) {
      const results = storage.searchEvents(search, id, limit);
      return NextResponse.json({ results, sessionId: id });
    }

    const events = storage.getEvents({
      sessionId: id,
      startTimestamp,
      endTimestamp,
      eventTypes,
      limit,
      offset,
    });

    return NextResponse.json({
      events: events.map((e: { event: unknown; serverTimestamp: number }) => ({
        ...e.event,
        serverTimestamp: e.serverTimestamp,
      })),
      sessionId: id,
      count: events.length,
      hasMore: events.length === limit,
    });
  } catch (error) {
    console.error('[flight-recorder] Session events error:', error);
    return NextResponse.json({ error: 'Failed to get events' }, { status: 500 });
  }
}
