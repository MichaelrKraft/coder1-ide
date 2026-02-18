/**
 * Johnny5 Content Factory — Scout Agent
 *
 * Researches the 5 most important AI/dev-tool stories from the last 24 hours
 * using Gemini 2.5 Flash with Google Search grounding, then posts each as a
 * rich embed to Discord #research.
 *
 * Usage:
 *   import { runScout } from '@/services/johnny5/content-factory/scout-service';
 *   const result = await runScout();
 *
 * Graceful degradation:
 *   - Missing DISCORD_WEBHOOK_RESEARCH → logs stories, does not throw
 *   - Missing GEMINI_API_KEY           → throws (Scout cannot work without it)
 *   - Gemini returns <5 stories        → returns whatever it found (min 1)
 *   - One Discord post fails           → others still proceed
 *
 * Persistence:
 *   Writes last run to data/johnny5/content-factory/last-scout.json so
 *   future Quill agent can read it without re-running Scout.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  postEmbedToDiscord,
  CATEGORY_COLORS,
  type DiscordEmbed,
} from '@/lib/discord-webhook';

// ============================================================================
// Types
// ============================================================================

export type StoryCategory =
  | 'model-release'
  | 'research'
  | 'tool'
  | 'industry'
  | 'policy';

export interface Story {
  title: string;
  summary: string;       // 2-3 sentences explaining what happened
  significance: string;  // Why this matters for software developers
  sourceUrl: string;     // Primary source URL
  category: StoryCategory;
}

export interface ScoutResult {
  stories: Story[];
  runAt: string;         // ISO 8601 timestamp
  model: string;         // Gemini model used
}

// Raw shape that Gemini returns inside its text (we parse this)
interface RawStory {
  title?: unknown;
  summary?: unknown;
  significance?: unknown;
  sourceUrl?: unknown;
  source_url?: unknown;  // Gemini sometimes camelCases differently
  category?: unknown;
}

// ============================================================================
// Constants
// ============================================================================

const SCOUT_PROMPT = `You are a tech journalist assistant. Search the web for the 5 most important AI and developer tool news stories published in the last 24 hours.

Focus on:
- New AI model releases (GPT, Claude, Gemini, Llama, Mistral, etc.)
- Significant AI research papers or breakthroughs
- Major new developer tools, frameworks, or platform launches
- Important industry news that affects software developers
- AI policy or regulatory changes with real-world impact

For each story, provide:
1. A concise, factual title (max 80 characters)
2. A 2-3 sentence summary of what happened
3. A 1-2 sentence explanation of why this matters for software developers
4. The primary source URL (official blog, paper, or reputable news outlet)
5. A category: model-release | research | tool | industry | policy

Respond with ONLY a valid JSON array. No markdown fences, no commentary. Example format:
[
  {
    "title": "Story title here",
    "summary": "What happened in 2-3 sentences.",
    "significance": "Why developers should care.",
    "sourceUrl": "https://example.com/article",
    "category": "tool"
  }
]

Find exactly 5 stories. If you cannot find 5 real stories from the last 24 hours, include the most recent ones you can verify.`;

const PERSIST_PATH = path.join(
  process.cwd(),
  'data',
  'johnny5',
  'content-factory',
  'last-scout.json'
);

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 60_000;

// ============================================================================
// Main export
// ============================================================================

export async function runScout(): Promise<ScoutResult> {
  console.log('[Scout] Starting research run...');

  const stories = await fetchStoriesWithGrounding();

  const result: ScoutResult = {
    stories,
    runAt: new Date().toISOString(),
    model: GEMINI_MODEL,
  };

  // Persist so morning-brief-generator and future Quill agent can read it
  persistResult(result);

  console.log(`[Scout] Run complete. ${stories.length} stories found.`);
  return result;
}

// ============================================================================
// Gemini call with grounding
// ============================================================================

async function fetchStoriesWithGrounding(): Promise<Story[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('[Scout] GEMINI_API_KEY is not set. Cannot run Scout without it.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: SCOUT_PROMPT }],
      },
    ],
    // google_search grounding — provides real-time web access.
    // NOTE: google_search and responseMimeType:'application/json' are mutually
    // exclusive in Gemini. We parse JSON from the text response instead.
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.1,   // Low temperature for factual accuracy
      maxOutputTokens: 2048,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let responseText: string;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as GeminiNativeResponse;
    responseText = extractTextFromGeminiResponse(data);
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`[Scout] Gemini request timed out after ${GEMINI_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  }

  return parseStoriesFromText(responseText);
}

// ============================================================================
// Response parsing
// ============================================================================

interface GeminiNativeResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message: string; code: number };
}

function extractTextFromGeminiResponse(data: GeminiNativeResponse): string {
  if (data.error) {
    throw new Error(`Gemini returned error: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('[Scout] Gemini response contained no text content');
  }

  return text;
}

function parseStoriesFromText(text: string): Story[] {
  // Strip markdown code fences if Gemini wraps the JSON despite instructions
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  // Find the JSON array (starts with '[' and ends with ']')
  const jsonStart = cleaned.indexOf('[');
  const jsonEnd = cleaned.lastIndexOf(']');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`[Scout] Could not locate JSON array in Gemini response. Raw: ${text.slice(0, 200)}`);
  }

  const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);

  let rawStories: RawStory[];
  try {
    rawStories = JSON.parse(jsonStr);
  } catch (parseError) {
    throw new Error(`[Scout] JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}. Raw JSON: ${jsonStr.slice(0, 200)}`);
  }

  if (!Array.isArray(rawStories) || rawStories.length === 0) {
    throw new Error('[Scout] Gemini returned an empty or non-array response');
  }

  const stories: Story[] = rawStories.map((raw, idx) => validateAndNormaliseStory(raw, idx));

  console.log(`[Scout] Parsed ${stories.length} stories from Gemini response`);
  return stories;
}

const VALID_CATEGORIES = new Set<StoryCategory>([
  'model-release', 'research', 'tool', 'industry', 'policy',
]);

function validateAndNormaliseStory(raw: RawStory, index: number): Story {
  const title = String(raw.title || `Story ${index + 1}`).slice(0, 80);
  const summary = String(raw.summary || '').slice(0, 500);
  const significance = String(raw.significance || '').slice(0, 300);
  // Handle both camelCase variants Gemini might emit
  const sourceUrl = String(raw.sourceUrl || raw.source_url || '').trim();
  const rawCategory = String(raw.category || 'industry').toLowerCase();
  const category: StoryCategory = VALID_CATEGORIES.has(rawCategory as StoryCategory)
    ? (rawCategory as StoryCategory)
    : 'industry';

  if (!summary) {
    console.warn(`[Scout] Story "${title}" has no summary`);
  }
  if (!sourceUrl) {
    console.warn(`[Scout] Story "${title}" has no sourceUrl`);
  }

  return { title, summary, significance, sourceUrl, category };
}

// ============================================================================
// Discord posting
// ============================================================================

/** Category → friendly label for Discord embed footer */
const CATEGORY_LABELS: Record<StoryCategory, string> = {
  'model-release': '🤖 Model Release',
  'research':      '📄 Research',
  'tool':          '🔧 Tool',
  'industry':      '🏢 Industry',
  'policy':        '⚖️ Policy',
};

/**
 * Optional: post Scout stories to Discord #research.
 * Called explicitly when Discord delivery is desired (e.g., future CLI flag).
 * runScout() does NOT call this automatically — stories reach users via the
 * morning brief instead.
 */
export async function postStoriesToDiscord(stories: Story[]): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_RESEARCH;

  if (!webhookUrl) {
    console.warn('[Scout] DISCORD_WEBHOOK_RESEARCH is not set — skipping Discord delivery.');
    return;
  }

  console.log(`[Scout] Posting ${stories.length} stories to Discord #research...`);

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const embed = buildEmbed(story, i + 1, stories.length);
    const ok = await postEmbedToDiscord(webhookUrl, embed);

    if (ok) {
      console.log(`[Scout] Posted story ${i + 1}/${stories.length}: "${story.title}"`);
    } else {
      console.error(`[Scout] Failed to post story ${i + 1}/${stories.length}: "${story.title}"`);
    }

    // 500ms delay between posts to respect Discord rate limits (5 req/2s)
    if (i < stories.length - 1) {
      await sleep(500);
    }
  }
}

function buildEmbed(story: Story, index: number, total: number): DiscordEmbed {
  const color = CATEGORY_COLORS[story.category] ?? 0x5865F2;
  const categoryLabel = CATEGORY_LABELS[story.category] ?? story.category;

  const embed: DiscordEmbed = {
    title: story.title,
    description: story.summary,
    color,
    fields: [
      {
        name: 'Why It Matters',
        value: story.significance || '_No significance noted_',
        inline: false,
      },
    ],
    footer: {
      text: `${categoryLabel}  •  ${index}/${total}  •  Scout by Johnny5`,
    },
    timestamp: new Date().toISOString(),
  };

  // Only set url if it's a valid-looking URL (avoids Discord 400 errors)
  if (story.sourceUrl && story.sourceUrl.startsWith('http')) {
    embed.url = story.sourceUrl;
  } else if (story.sourceUrl) {
    // Append source as a field instead
    embed.fields!.push({
      name: 'Source',
      value: story.sourceUrl,
      inline: false,
    });
  }

  return embed;
}

// ============================================================================
// Persistence
// ============================================================================

function persistResult(result: ScoutResult): void {
  try {
    const dir = path.dirname(PERSIST_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[Scout] Result persisted to ${PERSIST_PATH}`);
  } catch (error) {
    // Persistence failure must not abort the Scout run
    console.error('[Scout] Failed to persist result:', error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Read the last Scout result from disk (used by Quill in Phase 2).
 * Returns null if no previous run exists.
 */
export function readLastScoutResult(): ScoutResult | null {
  try {
    if (!fs.existsSync(PERSIST_PATH)) return null;
    const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
    return JSON.parse(raw) as ScoutResult;
  } catch {
    return null;
  }
}
