/**
 * Memory Compressor
 *
 * AI-powered compression of MEMORY.md to prevent unbounded growth.
 * Summarizes entries older than 14 days using Gemini Flash.
 * Recent 14 days stay raw for detailed recall.
 *
 * Triggered two ways:
 *   1. Weekly cron job (Sunday 3am) via cron-service.ts
 *   2. On-demand from heartbeat deep check when MEMORY.md exceeds 25K chars
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadLivingFile, writeLivingFile } from '@/lib/living-files';

// ============================================================================
// Constants
// ============================================================================

const MIN_SIZE_TO_COMPRESS = 8000;  // Only compress if >8KB — not worth it below this
const DAYS_TO_KEEP_RAW = 14;        // Keep last 14 days uncompressed for detailed recall
const DATE_HEADER_REGEX = /^### (\d{4}-\d{2}-\d{2})/;

// Module-level flag to prevent concurrent compression runs across heartbeat triggers
let isCompressing = false;

// ============================================================================
// Public API
// ============================================================================

/**
 * Compress MEMORY.md by summarizing entries older than DAYS_TO_KEEP_RAW days.
 *
 * Guards:
 * - No-op if file is smaller than MIN_SIZE_TO_COMPRESS (not worth it)
 * - No-op if another compression is already in progress
 * - No-op if Gemini is unavailable (safe degradation)
 * - No-op if compressed output is not meaningfully smaller (bad summary guard)
 *
 * @param userId - User whose MEMORY.md to compress ('default' = shared path)
 */
export async function compressMemoryMd(userId: string = 'default'): Promise<void> {
  if (isCompressing) {
    console.log('[Memory Compressor] Compression already in progress — skipping');
    return;
  }

  const content = loadLivingFile('MEMORY.md', userId);
  if (!content || content.length < MIN_SIZE_TO_COMPRESS) {
    console.log(`[Memory Compressor] MEMORY.md too small to compress (${content?.length ?? 0} chars) — skipping`);
    return;
  }

  isCompressing = true;
  try {
    const { oldContent, recentContent } = splitByAge(content, DAYS_TO_KEEP_RAW);

    if (!oldContent.trim()) {
      console.log('[Memory Compressor] No old entries to compress — skipping');
      return;
    }

    const summary = await summarizeWithGemini(oldContent);
    if (!summary) {
      console.warn('[Memory Compressor] Gemini summarization failed — leaving MEMORY.md unchanged');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const compressed = `## Historical Summary (auto-compressed ${today})\n\n${summary}\n\n## Recent Sessions (last ${DAYS_TO_KEEP_RAW} days)\n\n${recentContent}`;

    // Guard: only write if compression meaningfully reduces size
    if (compressed.length >= content.length * 0.9) {
      console.warn(`[Memory Compressor] Compressed output (${compressed.length} chars) not significantly smaller than original (${content.length} chars) — skipping`);
      return;
    }

    const success = writeLivingFile('MEMORY.md', compressed, 'replace', userId);
    if (success) {
      console.log(`[Memory Compressor] Compressed MEMORY.md: ${content.length} → ${compressed.length} chars (${Math.round((1 - compressed.length / content.length) * 100)}% reduction)`);
      // Re-index so memory search reflects compressed content, not stale pre-compression chunks
      try {
        const { indexLivingFile } = await import('@/services/memory/sources/living-files-indexer');
        await indexLivingFile('MEMORY.md', userId);
        console.log('[Memory Compressor] MEMORY.md re-indexed after compression');
      } catch (indexErr) {
        console.warn('[Memory Compressor] Re-indexing after compression failed:', indexErr);
      }
    } else {
      console.error('[Memory Compressor] Failed to write compressed MEMORY.md');
    }
  } catch (error) {
    console.error('[Memory Compressor] Unexpected error during compression:', error);
  } finally {
    isCompressing = false;
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Split MEMORY.md content into "old" and "recent" sections by date headers.
 *
 * Parses `### YYYY-MM-DD` section headers. Falls back to a 70/30 char-count
 * split if no date headers are found (malformed/legacy file).
 */
function splitByAge(content: string, cutoffDays: number): { oldContent: string; recentContent: string } {
  const cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const lines = content.split('\n');
  const sections: Array<{ date: string | null; lines: string[] }> = [];
  let currentSection: { date: string | null; lines: string[] } = { date: null, lines: [] };

  for (const line of lines) {
    const match = line.match(DATE_HEADER_REGEX);
    if (match) {
      if (currentSection.lines.length > 0 || currentSection.date !== null) {
        sections.push(currentSection);
      }
      currentSection = { date: match[1], lines: [line] };
    } else {
      currentSection.lines.push(line);
    }
  }
  if (currentSection.lines.length > 0 || currentSection.date !== null) {
    sections.push(currentSection);
  }

  // Fallback: no date headers found — split at 70% mark
  const hasDates = sections.some(s => s.date !== null);
  if (!hasDates) {
    const splitPoint = Math.floor(content.length * 0.7);
    return {
      oldContent: content.slice(0, splitPoint),
      recentContent: content.slice(splitPoint),
    };
  }

  const oldParts: string[] = [];
  const recentParts: string[] = [];

  for (const section of sections) {
    const sectionText = section.lines.join('\n');
    // Undated preamble and entries older than cutoff go to "old"
    if (section.date === null || section.date <= cutoffStr) {
      oldParts.push(sectionText);
    } else {
      recentParts.push(sectionText);
    }
  }

  return {
    oldContent: oldParts.join('\n'),
    recentContent: recentParts.join('\n'),
  };
}

/**
 * Summarize old memory entries using Gemini Flash.
 * Returns null if Gemini is unavailable or the call fails — caller handles gracefully.
 */
async function summarizeWithGemini(content: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Memory Compressor] GEMINI_API_KEY not set — cannot compress');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });

    const result = await model.generateContent(`You are compressing an AI assistant's long-term memory log. Summarize these older conversation memory entries into a concise factual summary.

Rules:
- Keep: key decisions, user preferences, project context, important technical facts
- Drop: routine greetings, duplicate information, mundane exchanges
- Maximum 400 words
- Use bullet points for readability
- Preserve exact values for preferences (e.g., favorite color, name, age, specific config values)

Memory entries to compress:
${content}`);

    return result.response.text() || null;
  } catch (error) {
    console.error('[Memory Compressor] Gemini API error:', error);
    return null;
  }
}
