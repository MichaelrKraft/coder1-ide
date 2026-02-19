/**
 * Johnny5 Content Factory — Quill Agent (Phase 2)
 *
 * Reads Scout's top story from disk, then uses Claude to generate a
 * structured 5-minute YouTube script (hook, 3 points, CTA, timestamps).
 * Posts the script as a rich embed to Discord #scripts.
 *
 * Usage:
 *   import { runQuill } from '@/services/johnny5/content-factory/quill-service';
 *   const result = await runQuill();
 *
 * Graceful degradation:
 *   - Missing DISCORD_WEBHOOK_SCRIPTS → logs script, does not throw
 *   - Missing ANTHROPIC_API_KEY       → throws (Quill cannot work without it)
 *   - No Scout result on disk         → throws with actionable message
 *
 * Persistence:
 *   Writes last run to data/johnny5/content-factory/last-quill.json so
 *   the future Pixel agent can generate thumbnails without re-running Quill.
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { postEmbedToDiscord, type DiscordEmbed } from '@/lib/discord-webhook';
import { readLastScoutResult, type Story } from './scout-service';

// ============================================================================
// Types
// ============================================================================

export interface ScriptSection {
  timestamp: string;  // e.g. "0:00", "1:30"
  label: string;      // e.g. "Hook", "Point 1: ..."
  content: string;    // Script copy for that section
}

export interface QuillResult {
  storyTitle: string;
  storyUrl: string;
  scriptTitle: string;     // YouTube video title (SEO-friendly)
  hook: string;            // Opening 30 seconds — what makes someone stop scrolling
  sections: ScriptSection[];
  cta: string;             // Call-to-action for end of video
  estimatedDuration: string; // e.g. "5:30"
  runAt: string;           // ISO 8601 timestamp
}

// ============================================================================
// Constants
// ============================================================================

const PERSIST_PATH = path.join(
  process.cwd(),
  'data',
  'johnny5',
  'content-factory',
  'last-quill.json'
);

const MODEL = 'claude-sonnet-4-6-20250514';
const TIMEOUT_MS = 60_000;

// ============================================================================
// Prompt
// ============================================================================

function buildPrompt(story: Story): string {
  return `You are a YouTube scriptwriter for a tech channel targeting software developers and AI enthusiasts.

Write a structured 5-minute YouTube script based on this story:

TITLE: ${story.title}
SUMMARY: ${story.summary}
WHY IT MATTERS: ${story.significance}
SOURCE: ${story.sourceUrl}

Produce ONLY a valid JSON object with this exact shape (no markdown, no commentary):
{
  "scriptTitle": "SEO-optimized YouTube title (max 70 chars, include a number or year if relevant)",
  "hook": "The opening 30-second hook — a surprising fact, bold claim, or question that makes someone stop scrolling. Write the actual words to say out loud.",
  "sections": [
    { "timestamp": "0:00", "label": "Hook", "content": "Copy from the hook above" },
    { "timestamp": "0:35", "label": "Context: What happened", "content": "2-3 sentences explaining the story for a developer audience" },
    { "timestamp": "1:30", "label": "Point 1: [key insight]", "content": "Deep dive on the first main thing developers need to understand" },
    { "timestamp": "2:45", "label": "Point 2: [key insight]", "content": "Second main point with concrete examples or implications" },
    { "timestamp": "3:50", "label": "Point 3: [key insight]", "content": "Third point — often the practical 'what do I do with this?' angle" },
    { "timestamp": "4:40", "label": "CTA & Wrap", "content": "Copy from the cta field below" }
  ],
  "cta": "Specific call-to-action: what should viewers do next? Subscribe prompt, link to source, related video suggestion — write the actual words.",
  "estimatedDuration": "5:10"
}

Rules:
- Write the actual script copy, not descriptions of what to write
- Developer audience: skip the hype, emphasize practical implications
- Each section content should be 2-5 sentences of real script dialogue
- Keep the total script to 5 minutes when read at normal pace (~130 words/min = 650 words total)`;
}

// ============================================================================
// Main export
// ============================================================================

export async function runQuill(): Promise<QuillResult> {
  console.log('[Quill] Starting script generation...');

  // 1. Load Scout's latest result
  const scout = readLastScoutResult();
  if (!scout || scout.stories.length === 0) {
    throw new Error('[Quill] No Scout result found. Run Scout first: POST /api/johnny5/cron/control { action: "run-content-factory" }');
  }

  const topStory = scout.stories[0];
  console.log(`[Quill] Writing script for: "${topStory.title}"`);

  // 2. Generate script with Claude
  const raw = await generateScript(topStory);

  // 3. Persist to disk for Pixel
  ensureDir(path.dirname(PERSIST_PATH));
  const result: QuillResult = {
    ...raw,
    storyTitle: topStory.title,
    storyUrl: topStory.sourceUrl,
    runAt: new Date().toISOString(),
  };
  fs.writeFileSync(PERSIST_PATH, JSON.stringify(result, null, 2));
  console.log(`[Quill] Script saved to ${PERSIST_PATH}`);

  // 4. Post to Discord #scripts
  const webhookUrl = process.env.DISCORD_WEBHOOK_SCRIPTS;
  if (!webhookUrl) {
    console.warn('[Quill] DISCORD_WEBHOOK_SCRIPTS is not set — skipping Discord delivery.');
  } else {
    await postScriptToDiscord(webhookUrl, result);
  }

  console.log(`[Quill] Done. Script: "${result.scriptTitle}" (~${result.estimatedDuration})`);
  return result;
}

/**
 * Read the last Quill result from disk (used by Pixel in Phase 3).
 * Returns null if no previous run exists.
 */
export function readLastQuillResult(): QuillResult | null {
  try {
    if (!fs.existsSync(PERSIST_PATH)) return null;
    const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
    return JSON.parse(raw) as QuillResult;
  } catch {
    return null;
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

async function generateScript(story: Story): Promise<Omit<QuillResult, 'storyTitle' | 'storyUrl' | 'runAt'>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('[Quill] ANTHROPIC_API_KEY is not set');

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildPrompt(story);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const message = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
    return parseScriptResponse(text);
  } catch (error: unknown) {
    clearTimeout(timeout);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('aborted')) throw new Error('[Quill] Claude request timed out');
    throw new Error(`[Quill] Claude API error: ${msg}`);
  }
}

function parseScriptResponse(text: string): Omit<QuillResult, 'storyTitle' | 'storyUrl' | 'runAt'> {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      scriptTitle: String(parsed.scriptTitle || 'Untitled Script'),
      hook: String(parsed.hook || ''),
      sections: Array.isArray(parsed.sections) ? parsed.sections.map((s: Record<string, unknown>) => ({
        timestamp: String(s.timestamp || '0:00'),
        label: String(s.label || ''),
        content: String(s.content || ''),
      })) : [],
      cta: String(parsed.cta || ''),
      estimatedDuration: String(parsed.estimatedDuration || '5:00'),
    };
  } catch {
    throw new Error('[Quill] Failed to parse Claude response as JSON');
  }
}

async function postScriptToDiscord(webhookUrl: string, result: QuillResult): Promise<void> {
  // Header embed: title card
  const headerEmbed: DiscordEmbed = {
    title: `📝 New Script Ready`,
    description: `**${result.scriptTitle}**\n\nBased on: [${result.storyTitle}](${result.storyUrl})`,
    color: 0x6366f1, // indigo
    footer: { text: `Estimated duration: ${result.estimatedDuration} · Generated by Quill` },
    timestamp: result.runAt,
  };

  const ok = await postEmbedToDiscord(webhookUrl, headerEmbed);
  if (!ok) {
    console.warn('[Quill] Failed to post header embed to Discord');
    return;
  }

  // Sections embed: the actual script
  const scriptBody = result.sections
    .map(s => `**[${s.timestamp}] ${s.label}**\n${s.content}`)
    .join('\n\n');

  const scriptEmbed: DiscordEmbed = {
    description: scriptBody.slice(0, 4000), // Discord embed description limit
    color: 0x6366f1,
  };

  await postEmbedToDiscord(webhookUrl, scriptEmbed);
  console.log('[Quill] Script posted to Discord #scripts');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
