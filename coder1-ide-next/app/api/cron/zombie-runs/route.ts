import { NextResponse } from 'next/server';
import { detectAndFixZombieRuns } from '@/lib/agent-hub/zombie-detector';

export async function GET(): Promise<NextResponse> {
  try {
    const fixed = await detectAndFixZombieRuns();
    return NextResponse.json({ fixed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/cron/zombie-runs] error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
