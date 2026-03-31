import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getStorage() {
  const { FlightRecorderStorage } = require('@/lib/flight-recorder/storage');
  return FlightRecorderStorage.getInstance();
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const storage = getStorage();
    const sessions = storage.getSessions(10000, 0);
    let deleted = 0;

    for (const session of sessions) {
      storage.deleteSession(session.id);
      deleted++;
    }

    return NextResponse.json({ deleted, message: 'All recordings deleted' });
  } catch (error) {
    console.error('[flight-recorder] Delete all error:', error);
    return NextResponse.json({ error: 'Failed to delete recordings' }, { status: 500 });
  }
}
