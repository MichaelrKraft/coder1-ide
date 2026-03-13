import { NextRequest } from 'next/server';
import { startCapture, stopCapture, getCaptureStats } from '@/services/flowtrace/capture-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      // Start capture in background — don't await the infinite loop
      startCapture().catch((err) => {
        console.error('[FlowTrace] Capture error:', err);
      });
      return Response.json({ success: true, message: 'Capture started' });
    }

    if (action === 'stop') {
      stopCapture();
      return Response.json({ success: true, message: 'Capture stopped' });
    }

    return Response.json({ error: 'action must be "start" or "stop"' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json(getCaptureStats());
}
