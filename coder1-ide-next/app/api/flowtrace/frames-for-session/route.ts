/**
 * GET /api/flowtrace/frames-for-session?session_id=<id>
 *
 * Resolves a Coder1 session_id to a time window via the checkpoints table,
 * then fetches matching Screenpipe frames from that window.
 *
 * This is the critical join logic: session_id (Coder1) → timestamp range (Screenpipe).
 */

import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'db', 'context-memory.db');

interface TimeWindow {
  session_start: string;
  session_end: string;
}

interface ScreenpipeFrame {
  frame_id: number;
  timestamp: string;
  app_name: string;
  window_title: string;
  file_path: string;
  text: string;
}

interface ScreenpipeSearchResult {
  data: Array<{
    content: {
      frame_id: number;
      timestamp: string;
      app_name: string;
      window_name: string;
      file_path: string;
      text: string;
      browser_url?: string;
    };
    type: string;
  }>;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return Response.json({ error: 'session_id is required' }, { status: 400 });
  }

  // Step 1: Check Screenpipe is running
  try {
    const health = await fetch('http://localhost:3030/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (!health.ok) throw new Error('unhealthy');
  } catch {
    return Response.json(
      { error: 'Screenpipe is not running. Start it to enable FlowTrace.' },
      { status: 503 }
    );
  }

  // Step 2: Resolve session_id → time window from checkpoints table
  let timeWindow: TimeWindow | null = null;
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const row = db.prepare(`
      SELECT
        MIN(created_at) AS session_start,
        MAX(created_at) AS session_end
      FROM checkpoints
      WHERE session_id = ?
    `).get(sessionId) as TimeWindow | undefined;
    db.close();

    if (!row || !row.session_start) {
      return Response.json({ frames: [] }, { status: 200 });
    }
    timeWindow = row;
  } catch (dbErr) {
    console.error('[FlowTrace] DB error resolving session time window:', dbErr);
    return Response.json({ error: 'Failed to resolve session time window' }, { status: 500 });
  }

  // Step 3: Query Screenpipe REST API with the time window
  try {
    const params = new URLSearchParams({
      start_time: new Date(timeWindow.session_start).toISOString(),
      end_time: new Date(timeWindow.session_end).toISOString(),
      limit: '6',
      content_type: 'ocr',
    });

    const screenpipeRes = await fetch(`http://localhost:3030/search?${params}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!screenpipeRes.ok) {
      return Response.json({ frames: [] });
    }

    const data = (await screenpipeRes.json()) as ScreenpipeSearchResult;

    // Normalize and deduplicate by app_name + window to avoid near-identical frames
    const seen = new Set<string>();
    const frames: ScreenpipeFrame[] = [];

    for (const item of data.data || []) {
      if (item.type !== 'OCR') continue;
      const c = item.content;
      const dedupeKey = `${c.app_name}:${c.window_name}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      frames.push({
        frame_id: c.frame_id,
        timestamp: c.timestamp,
        app_name: c.app_name,
        window_title: c.window_name,
        file_path: c.file_path,
        text: c.text?.slice(0, 300) ?? '',
      });

      if (frames.length >= 3) break; // Show at most 3 thumbnails
    }

    return Response.json({ frames, session_start: timeWindow.session_start, session_end: timeWindow.session_end });
  } catch (fetchErr) {
    console.error('[FlowTrace] Screenpipe fetch error:', fetchErr);
    return Response.json({ frames: [] });
  }
}
