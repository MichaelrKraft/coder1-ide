/**
 * Johnny5 Content Factory — Pixel Agent (Phase 3)
 *
 * Reads Quill's top script from disk, then generates 3 YouTube thumbnail
 * candidates via fal.ai flux/schnell. Posts thumbnails to Discord #thumbnails.
 *
 * Usage:
 *   import { runPixel } from '@/services/johnny5/content-factory/pixel-service';
 *   const result = await runPixel();
 *
 * Graceful degradation:
 *   - Missing DISCORD_WEBHOOK_THUMBNAILS → logs warning, does not throw
 *   - Missing FAL_KEY                   → throws (Pixel cannot work without it)
 *   - No Quill result on disk           → throws with actionable message
 *   - Individual image failure          → continues with remaining (uses allSettled)
 *
 * Persistence:
 *   Writes last run to data/johnny5/content-factory/last-pixel.json
 */

import * as fal from '@fal-ai/serverless-client';
import * as fs from 'fs';
import * as path from 'path';
import { readLastQuillResult, type QuillResult } from './quill-service';
import { postEmbedToDiscord } from '@/lib/discord-webhook';

// ============================================================================
// Types
// ============================================================================

export interface PixelResult {
  storyTitle: string;
  scriptTitle: string;
  thumbnailUrls: string[];   // 1-3 candidates (allSettled — may be fewer than 3)
  prompts: string[];         // Prompts used for each successful thumbnail
  runAt: string;             // ISO 8601 timestamp
}

// ============================================================================
// Constants
// ============================================================================

const PERSIST_PATH = path.join(
  process.cwd(),
  'data',
  'johnny5',
  'content-factory',
  'last-pixel.json'
);

const FAL_MODEL = 'fal-ai/flux/schnell';

// ============================================================================
// Main export
// ============================================================================

export async function runPixel(): Promise<PixelResult> {
  console.log('[Pixel] Starting thumbnail generation...');

  // 1. Guard: FAL_KEY required
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error('[Pixel] FAL_KEY is not set');

  // 2. Load Quill's latest result
  const quill = readLastQuillResult();
  if (!quill) {
    throw new Error('[Pixel] No Quill result found. Run Quill first: POST /api/johnny5/cron/control { action: "run-quill" }');
  }

  console.log(`[Pixel] Generating thumbnails for: "${quill.scriptTitle}"`);

  // 3. Configure fal.ai
  fal.config({ credentials: falKey });

  // 4. Build 3 style-diverse prompts
  const prompts = buildThumbnailPrompts(quill);

  // 5. Generate all 3 in parallel; continue if 1 or 2 fail (content policy etc.)
  const settled = await Promise.allSettled(
    prompts.map(prompt =>
      fal.run(FAL_MODEL, {
        input: { prompt, image_size: 'landscape_16_9', num_images: 1 },
      })
    )
  );

  const successfulResults = settled
    .map((r, i) => ({ result: r, promptIndex: i }))
    .filter((item): item is { result: PromiseFulfilledResult<unknown>; promptIndex: number } =>
      item.result.status === 'fulfilled'
    );

  if (successfulResults.length === 0) {
    throw new Error('[Pixel] All 3 fal.ai image generations failed');
  }

  // Log any failures
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[Pixel] Prompt ${i + 1} failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    }
  });

  const thumbnailUrls = successfulResults.map(
    item => (item.result.value as { images: Array<{ url: string }> }).images[0].url
  );
  const usedPrompts = successfulResults.map(item => prompts[item.promptIndex]);

  // 6. Persist to disk
  ensureDir(path.dirname(PERSIST_PATH));
  const pixelResult: PixelResult = {
    storyTitle: quill.storyTitle,
    scriptTitle: quill.scriptTitle,
    thumbnailUrls,
    prompts: usedPrompts,
    runAt: new Date().toISOString(),
  };
  fs.writeFileSync(PERSIST_PATH, JSON.stringify(pixelResult, null, 2));
  console.log(`[Pixel] Saved to ${PERSIST_PATH}`);

  // 7. Post to Discord #thumbnails
  const webhookUrl = process.env.DISCORD_WEBHOOK_THUMBNAILS;
  if (!webhookUrl) {
    console.warn('[Pixel] DISCORD_WEBHOOK_THUMBNAILS is not set — skipping Discord delivery.');
  } else {
    await postThumbnailsToDiscord(webhookUrl, pixelResult);
  }

  console.log(`[Pixel] Done. ${thumbnailUrls.length} thumbnail(s) generated for "${quill.scriptTitle}"`);
  return pixelResult;
}

/**
 * Read the last Pixel result from disk (used by future agents).
 * Returns null if no previous run exists.
 */
export function readLastPixelResult(): PixelResult | null {
  try {
    if (!fs.existsSync(PERSIST_PATH)) return null;
    const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
    return JSON.parse(raw) as PixelResult;
  } catch {
    return null;
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

function buildThumbnailPrompts(quill: QuillResult): string[] {
  const title = quill.scriptTitle;
  return [
    `YouTube thumbnail for tech channel video: "${title}". Bold text overlay, dramatic side lighting, dark gradient background, code or circuit board elements, high contrast, 4K cinematic quality`,
    `YouTube thumbnail for developer audience: "${title}". Clean minimalist design, soft gradient background, professional typography, geometric shapes, modern flat design style`,
    `YouTube thumbnail for software developers: "${title}". High contrast neon accents on dark background, cyberpunk aesthetic, glowing elements, futuristic tech style, vibrant colors`,
  ];
}

async function postThumbnailsToDiscord(webhookUrl: string, result: PixelResult): Promise<void> {
  // Header embed
  const headerOk = await postEmbedToDiscord(webhookUrl, {
    title: '🖼️ Thumbnails Ready',
    description: `**${result.scriptTitle}**\n\nBased on: ${result.storyTitle}`,
    color: 0x6366f1, // indigo — matches Quill/Scout palette
    footer: { text: `${result.thumbnailUrls.length} candidate(s) · Generated by Pixel` },
    timestamp: result.runAt,
  });

  if (!headerOk) {
    console.warn('[Pixel] Failed to post header embed to Discord');
    return;
  }

  // One embed per thumbnail (Discord only supports one image per embed)
  for (const url of result.thumbnailUrls) {
    await postEmbedToDiscord(webhookUrl, {
      color: 0x6366f1,
      image: { url },
    });
  }

  console.log(`[Pixel] ${result.thumbnailUrls.length} thumbnail embed(s) posted to Discord`);
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
