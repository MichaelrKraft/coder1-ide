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
const outDir = path.join(projectRoot, 'public', 'deck', 'js');
const outPath = path.join(outDir, 'config.js');

// Count frames if directory exists
if (existsSync(framesDir)) {
  const frameFiles = readdirSync(framesDir).filter((f) => f.endsWith('.webp'));
  config.productDemoFrames = frameFiles.length;
} else {
  config.productDemoFrames = 0;
}

// Ensure output directory exists
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const output = serializeConfigToJs(config);
writeFileSync(outPath, output, 'utf-8');

console.log(
  `✓ Wrote ${path.relative(projectRoot, outPath)} ` +
    `(${config.sections.length} sections, ${config.productDemoFrames} frames)`
);
