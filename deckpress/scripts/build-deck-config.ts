/**
 * Build-time script that serializes content/deck.config.ts into
 * public/deck/js/config.js for the vanilla cinematic frontend.
 *
 * Run via:  npm run build:config
 * Hooked into both `npm run dev` and `npm run build`.
 *
 * Also counts the number of .webp files in public/deck/frames/ and
 * injects that count into config.productDemoFrames so the canvas
 * renderer knows how many frames to preload.
 */

import { writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../content/deck.config';
import { serializeConfigToJs } from '../lib/build-config';

// tsx preserves ESM module context; derive __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const framesDir = path.join(projectRoot, 'public', 'deck', 'frames');

// Count frames if directory exists (cinematic template only)
if (existsSync(framesDir)) {
  const frameFiles = readdirSync(framesDir).filter((f) => f.endsWith('.webp'));
  config.productDemoFrames = frameFiles.length;
} else {
  config.productDemoFrames = 0;
}

// Each template gets its own copy of config.js so templates are
// fully self-contained (easier to swap / delete / productize later).
// Add more template directories here as they're created.
const templateDirs = [
  path.join(projectRoot, 'public', 'deck', 'js'),              // v1 Cinematic
  path.join(projectRoot, 'public', 'decks', 'keynote', 'js'),  // v2 Keynote
];

const output = serializeConfigToJs(config);

for (const outDir of templateDirs) {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'config.js');
  writeFileSync(outPath, output, 'utf-8');
  console.log(
    `✓ Wrote ${path.relative(projectRoot, outPath)} ` +
      `(${config.sections.length} sections, ${config.productDemoFrames} frames)`
  );
}
