import { NextResponse } from 'next/server';
import type { FlightEventBatch } from '@/lib/flight-recorder/types';

export const dynamic = 'force-dynamic';

function getWriter() {
  const { FlightRecorderWriter } = require('@/lib/flight-recorder/writer');
  return FlightRecorderWriter.getInstance();
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // sendBeacon sends as text/plain; handle both content types
    const contentType = request.headers.get('content-type') || '';
    let batch: FlightEventBatch;

    if (contentType.includes('application/json')) {
      batch = await request.json();
    } else {
      batch = JSON.parse(await request.text());
    }

    if (!batch.sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    if (!Array.isArray(batch.events) || batch.events.length === 0) {
      return NextResponse.json({ error: 'events array is required and must not be empty' }, { status: 400 });
    }

    const writer = getWriter();
    const result = await writer.processBatch(batch);

    return NextResponse.json({
      processed: result.processed,
      secretsDetected: result.secretsDetected,
    });
  } catch (error) {
    console.error('[flight-recorder] Event ingestion error:', error);
    return NextResponse.json({ error: 'Failed to process events' }, { status: 500 });
  }
}
