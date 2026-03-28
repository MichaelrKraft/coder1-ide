import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getStorage() {
  const { FlightRecorderStorage } = require('@/lib/flight-recorder/storage');
  return FlightRecorderStorage.getInstance();
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const starredParam = searchParams.get('starred');
    const search = searchParams.get('search');

    const storage = getStorage();

    // If search query provided, use FTS (may throw on malformed FTS5 syntax)
    if (search) {
      try {
        const results = storage.searchEvents(search, undefined, limit);
        return NextResponse.json({ results });
      } catch {
        return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
      }
    }

    const starred = starredParam === 'true' ? true : starredParam === 'false' ? false : undefined;
    const sessions = storage.getSessions(limit, offset, starred);
    const stats = storage.getStats();

    return NextResponse.json({ sessions, stats });
  } catch (error) {
    console.error('[flight-recorder] Sessions list error:', error);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}
