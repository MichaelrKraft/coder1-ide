import { NextResponse } from 'next/server';

export async function GET() {
  const enabled = process.env.FLOWTRACE_ENABLED === 'true';
  const configured = !!process.env.GEMINI_API_KEY;
  const cloudStorage = !!process.env.PINECONE_API_KEY;

  // Get actual capture state from the service
  let captureStats = { running: false, sessionId: null, framesCaptured: 0, framesSkipped: 0, framesFiltered: 0, lastEmbedTime: null };
  try {
    const { getCaptureStats } = require('@/services/flowtrace/capture-service');
    const stats = getCaptureStats();
    captureStats = {
      running: stats.running,
      sessionId: stats.sessionId,
      framesCaptured: stats.framesCaptured ?? 0,
      framesSkipped: stats.framesSkipped ?? 0,
      framesFiltered: stats.framesFiltered ?? 0,
      lastEmbedTime: stats.lastEmbedTime ?? null,
    };
  } catch {
    // capture-service not loaded yet — return defaults
  }

  // Check if Screenpipe is reachable
  let screenpipeRunning = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('http://localhost:3030/health', { signal: controller.signal });
    clearTimeout(timeout);
    screenpipeRunning = res.ok;
  } catch {
    // Screenpipe not running
  }

  return NextResponse.json({
    running: captureStats.running,
    enabled,
    configured,
    cloudStorage,
    screenpipeRunning,
    sessionId: captureStats.sessionId,
    framesCaptured: captureStats.framesCaptured,
    framesSkipped: captureStats.framesSkipped,
    framesFiltered: captureStats.framesFiltered,
    lastEmbedTime: captureStats.lastEmbedTime,
  });
}
