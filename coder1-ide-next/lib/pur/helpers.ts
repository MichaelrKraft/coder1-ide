/**
 * PUR utility functions — ID generation, week helpers, engagement scoring, hashing
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ================================================================================
// Week ISO
// ================================================================================

/**
 * Returns the current ISO week string in the format "YYYY-Www", e.g. "2026-W16".
 * Follows ISO 8601: week starts Monday, week 1 contains the first Thursday.
 */
export function currentWeekIso(): string {
  const now = new Date();
  // Copy date and shift to the nearest Thursday (ISO week date calculation)
  const thursday = new Date(now);
  thursday.setUTCDate(now.getUTCDate() + 4 - (now.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  const year = thursday.getUTCFullYear();
  const week = String(weekNumber).padStart(2, '0');
  return `${year}-W${week}`;
}

// ================================================================================
// ID generation
// ================================================================================

/**
 * Generates a prefixed ID consistent with the agent-hub pattern using crypto.randomUUID().
 * Example: generatePurId('find') → 'find_3f2a1b4c-...'
 */
export function generatePurId(prefix: string): string {
  const uuid = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}_${uuid}`;
}

// ================================================================================
// Engagement scoring
// ================================================================================

/**
 * Computes a normalized engagement score for ranking purposes.
 * Formula: (upvotes * sourceWeight + comments * 0.3) * recencyDecay(publishedAt)
 */
export function computeEngagementScore(
  upvotes: number,
  comments: number,
  publishedAt: number,
  sourceWeight: number
): number {
  const decay = recencyDecay(publishedAt);
  return (upvotes * sourceWeight + comments * 0.3) * decay;
}

function recencyDecay(publishedAt: number): number {
  const ageMs = Date.now() - publishedAt;
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 24) return 1.0;
  if (ageHours < 48) return 0.7;
  if (ageHours < 72) return 0.4;
  if (ageHours < 168) return 0.2; // < 7 days
  return 0.05;
}

// ================================================================================
// Content hashing (dedup)
// ================================================================================

/**
 * Returns a SHA-256 hex digest of the provided text for content deduplication.
 */
export function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// ================================================================================
// Screenshot pHash stub
// ================================================================================

/**
 * Placeholder pHash for screenshot comparison.
 * Reads the file and returns a hex string derived from a normalized pixel sample.
 * Full perceptual hash implementation is deferred — this stub returns a SHA-256
 * of the raw file bytes, which is sufficient for exact-duplicate detection until
 * a proper pHash library is integrated.
 */
export async function screenshotPHash(imagePath: string): Promise<string> {
  const buffer = await fs.promises.readFile(imagePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ================================================================================
// Morning brief helper
// ================================================================================

const MORNING_BRIEFS_DIR = path.join(
  process.cwd(),
  'public',
  'morning-briefs'
);

const MINIMAL_HTML_SCAFFOLD = (date: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Morning Brief — ${date}</title>
</head>
<body>
</body>
</html>
`;

/**
 * Appends an HTML section before the closing </body> tag in the morning brief
 * for the given date. Creates the file with a minimal scaffold if it does not exist.
 *
 * @param date   - "YYYY-MM-DD"
 * @param html   - The section HTML to inject before </body>
 */
export async function appendMorningBriefSection(date: string, html: string): Promise<void> {
  await fs.promises.mkdir(MORNING_BRIEFS_DIR, { recursive: true });

  const filePath = path.join(MORNING_BRIEFS_DIR, `${date}.html`);

  let existing: string;
  try {
    existing = await fs.promises.readFile(filePath, 'utf8');
  } catch {
    existing = MINIMAL_HTML_SCAFFOLD(date);
  }

  const updated = existing.replace('</body>', `${html}\n</body>`);
  await fs.promises.writeFile(filePath, updated, 'utf8');
}
