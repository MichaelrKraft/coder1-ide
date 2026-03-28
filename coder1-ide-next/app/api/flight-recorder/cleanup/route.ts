import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLEANUP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
let lastCleanupTime = 0;

function getStorage() {
  const { FlightRecorderStorage } = require('@/lib/flight-recorder/storage');
  return FlightRecorderStorage.getInstance();
}

export async function POST(): Promise<NextResponse> {
  try {
    const now = Date.now();
    if (now - lastCleanupTime < CLEANUP_COOLDOWN_MS) {
      const nextCleanup = new Date(lastCleanupTime + CLEANUP_COOLDOWN_MS).toISOString();
      return NextResponse.json({
        skipped: true,
        reason: 'Cleanup already ran recently',
        nextCleanup,
      });
    }

    const storage = getStorage();
    const cleaned = storage.cleanup(30);
    lastCleanupTime = now;

    const stats = storage.getStats();

    return NextResponse.json({
      cleaned,
      stats,
      nextCleanup: new Date(now + CLEANUP_COOLDOWN_MS).toISOString(),
    });
  } catch (error) {
    console.error('[flight-recorder] Cleanup error:', error);
    return NextResponse.json({ error: 'Failed to run cleanup' }, { status: 500 });
  }
}
