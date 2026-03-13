/**
 * FlowTrace Capture Service
 *
 * Listens to Screenpipe's streamVision() and processes frames through:
 *   credential filter → dHash dedup → Gemini Embedding 2 → Pinecone
 *
 * Event-driven: only embeds when content meaningfully changes.
 * Runs as a long-lived process alongside the Coder1 IDE dev server.
 */

import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { shouldCapture } from './credential-filter';
import { embedFrame } from './embedding-service';
import { upsertFrame, ensureIndexExists, FrameMetadata } from './pinecone-service';

// Emits 'firstSessionComplete' when the first 30+ min capture session ends.
// Server.js subscribes and forwards to clients via Socket.IO.
export const captureEvents = new EventEmitter();

// ============================================================================
// Configuration
// ============================================================================

const MIN_INTERVAL_MS = parseInt(process.env.FLOWTRACE_MIN_INTERVAL_SECS || '30') * 1000;
const MAX_INTERVAL_MS = parseInt(process.env.FLOWTRACE_MAX_INTERVAL_SECS || '300') * 1000;

// ============================================================================
// dHash (Difference Hash) for perceptual deduplication
// ============================================================================

/**
 * Computes a 64-bit difference hash from a JPEG buffer.
 * Two near-identical frames will have Hamming distance < 8.
 * Uses `sharp` which is already installed in coder1-ide-next.
 */
async function computeDHash(imageBase64: string): Promise<string> {
  // Dynamic import to avoid loading sharp on every module import
  const sharp = (await import('sharp')).default;
  const buffer = Buffer.from(imageBase64, 'base64');

  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 9 + col;
      hash += data[idx] > data[idx + 1] ? '1' : '0';
    }
  }
  return hash;
}

function hammingDistance(h1: string, h2: string): number {
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

// ============================================================================
// Content Type Detection
// ============================================================================

function detectContentType(
  appName: string,
  windowTitle: string,
  url?: string
): FrameMetadata['content_type'] {
  const app = appName.toLowerCase();
  const title = windowTitle.toLowerCase();

  if (app.includes('terminal') || app.includes('iterm') || app.includes('warp') ||
      app.includes('ghostty') || title.includes('bash') || title.includes('zsh')) {
    return 'terminal';
  }

  if (app.includes('chrome') || app.includes('firefox') || app.includes('safari') ||
      app.includes('arc') || app.includes('brave') || app.includes('edge')) {
    return 'browser';
  }

  if (app.includes('figma') || app.includes('sketch') || app.includes('canva') ||
      app.includes('photoshop') || app.includes('illustrator')) {
    return 'design';
  }

  if (app.includes('code') || app.includes('cursor') || app.includes('windsurf') ||
      app.includes('zed') || app.includes('intellij') || app.includes('webstorm')) {
    return 'code';
  }

  return 'other';
}

// ============================================================================
// Session ID
// ============================================================================

function makeSessionId(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const rand = Math.random().toString(36).slice(2, 8);
  return `sess_${date}_${rand}`;
}

// ============================================================================
// Capture Service
// ============================================================================

const CTA_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

interface CaptureState {
  lastHash: string;
  lastEmbedTime: number;
  sessionId: string;
  sessionStartTime: number;
  firstSessionFired: boolean;
  framesCapured: number;
  framesSkipped: number;
  framesFiltered: number;
  running: boolean;
}

const state: CaptureState = {
  lastHash: '',
  lastEmbedTime: 0,
  sessionId: makeSessionId(),
  sessionStartTime: 0,
  firstSessionFired: false,
  framesCapured: 0,
  framesSkipped: 0,
  framesFiltered: 0,
  running: false,
};

/**
 * Processes a single vision event from Screenpipe.
 * Returns 'captured' | 'skipped' | 'filtered' for logging.
 */
async function processFrame(event: {
  text: string;
  app_name: string;
  window_name: string;
  image: string; // base64 JPEG
  timestamp: string;
  browser_url?: string;
  frame_id?: string;
}): Promise<'captured' | 'skipped' | 'filtered'> {
  const now = Date.now();
  const elapsed = now - state.lastEmbedTime;

  // Skip if too recent AND max gap not exceeded
  if (elapsed < MIN_INTERVAL_MS && elapsed < MAX_INTERVAL_MS) {
    state.framesSkipped++;
    return 'skipped';
  }

  // Trust layer: check for sensitive data
  const filterResult = shouldCapture(
    event.text,
    event.app_name,
    event.window_name,
    event.browser_url
  );

  if (!filterResult.allowed) {
    console.log(`[FlowTrace] Frame filtered: ${filterResult.reason}`);
    state.framesFiltered++;
    return 'filtered';
  }

  // dHash dedup: skip if visually near-identical to last frame
  // (unless max gap exceeded — then always embed)
  if (elapsed < MAX_INTERVAL_MS) {
    try {
      const newHash = await computeDHash(event.image);
      if (state.lastHash && hammingDistance(newHash, state.lastHash) < 8) {
        state.framesSkipped++;
        return 'skipped';
      }
      state.lastHash = newHash;
    } catch (err) {
      // dHash failure is non-fatal — continue without dedup
      console.warn('[FlowTrace] dHash failed, skipping dedup:', err);
      state.lastHash = '';
    }
  }

  // Embed the frame (image + OCR text → single 1536-dim vector)
  const embedding = await embedFrame(event.image, event.text);

  // Build metadata
  const timestamp = Math.floor(new Date(event.timestamp).getTime() / 1000);
  const phash = state.lastHash || createHash('sha256').update(event.image.slice(0, 100)).digest('hex').slice(0, 16);

  const metadata: FrameMetadata = {
    session_id: state.sessionId,
    timestamp,
    timestamp_iso: new Date(timestamp * 1000).toISOString(),
    frame_id: event.frame_id || `frame_${timestamp}`,
    ocr_text_preview: event.text.slice(0, 500),
    app_name: event.app_name,
    window_title: event.window_name,
    url: event.browser_url || '',
    screenshot_path: '', // Screenpipe manages its own paths; we don't duplicate storage
    content_type: detectContentType(event.app_name, event.window_name, event.browser_url),
    phash,
    ambient_session_id: '', // Enriched later by ambient correlation
  };

  // Store in Pinecone
  await upsertFrame(embedding, metadata);

  state.lastEmbedTime = now;
  state.framesCapured++;

  return 'captured';
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Starts the FlowTrace capture loop.
 * Connects to Screenpipe at localhost:3030 and processes vision events.
 */
export async function startCapture(): Promise<void> {
  if (process.env.FLOWTRACE_ENABLED !== 'true') {
    throw new Error('[FlowTrace] Set FLOWTRACE_ENABLED=true in .env.local to enable capture.');
  }

  if (state.running) {
    console.log('[FlowTrace] Capture already running.');
    return;
  }

  // Verify Screenpipe is available
  try {
    const health = await fetch('http://localhost:3030/health');
    if (!health.ok) throw new Error(`Screenpipe health check failed: ${health.status}`);
  } catch (err) {
    throw new Error(
      `[FlowTrace] Screenpipe is not running at localhost:3030. ` +
      `Start it before enabling FlowTrace capture. Error: ${err}`
    );
  }

  // Initialize Pinecone index (no-op if already exists)
  await ensureIndexExists();

  state.running = true;
  state.sessionId = makeSessionId();
  state.sessionStartTime = Date.now();
  console.log(`[FlowTrace] Capture started. Session: ${state.sessionId}`);
  console.log(`[FlowTrace] Intervals: min=${MIN_INTERVAL_MS / 1000}s, max=${MAX_INTERVAL_MS / 1000}s`);

  // Import Screenpipe SDK and start streaming
  // Using dynamic import to avoid startup errors when Screenpipe isn't installed
  try {
    const { pipe } = await import('@screenpipe/js');

    for await (const event of pipe.streamVision(true)) {
      if (!state.running) break;

      try {
        const result = await processFrame({
          text: event.data.text || '',
          app_name: event.data.app_name || '',
          window_name: event.data.window_name || '',
          image: event.data.image || '',
          timestamp: event.data.timestamp || new Date().toISOString(),
          browser_url: event.data.browser_url,
          frame_id: String(event.data.frame_id || ''),
        });

        if (result === 'captured') {
          console.log(`[FlowTrace] Captured frame from ${event.data.app_name} (total: ${state.framesCapured})`);
        }
      } catch (frameErr) {
        // Frame processing errors are non-fatal — log and continue
        console.error('[FlowTrace] Frame processing error:', frameErr);
      }
    }
  } catch (importErr) {
    state.running = false;
    throw new Error(`[FlowTrace] Failed to import @screenpipe/js: ${importErr}`);
  }
}

export function stopCapture(): void {
  state.running = false;
  const durationMs = Date.now() - state.sessionStartTime;
  console.log(
    `[FlowTrace] Capture stopped. Stats: captured=${state.framesCapured}, ` +
    `skipped=${state.framesSkipped}, filtered=${state.framesFiltered}, ` +
    `duration=${Math.round(durationMs / 60000)}m`
  );

  // CTA: fire after the first qualifying session ends (~30 min, at least 1 captured frame)
  if (!state.firstSessionFired && durationMs >= CTA_THRESHOLD_MS && state.framesCapured > 0) {
    state.firstSessionFired = true;
    captureEvents.emit('firstSessionComplete', {
      sessionId: state.sessionId,
      durationMs,
      framesCaptured: state.framesCapured,
    });
    console.log('[FlowTrace] First session CTA fired.');
  }
}

export function getCaptureStats() {
  return {
    running: state.running,
    sessionId: state.sessionId,
    framesCapured: state.framesCapured,
    framesSkipped: state.framesSkipped,
    framesFiltered: state.framesFiltered,
    lastEmbedTime: state.lastEmbedTime ? new Date(state.lastEmbedTime).toISOString() : null,
  };
}
