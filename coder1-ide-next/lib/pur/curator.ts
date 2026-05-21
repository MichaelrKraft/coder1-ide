/**
 * PUR Curator — selects the best weekly finds using Claude AI and the taste profile.
 * Enforces category quotas, creator diversity, and deduplication before inserting
 * into pur_curated for Mike's approval.
 */

import fs from 'fs';
import path from 'path';
import { getAgentHubDatabase } from '../agent-hub/db';
import { generatePurId, currentWeekIso } from './helpers';
import type { CurationBatch, PurFind, PurCurated, PurCuratedCategory } from '../../types/pur';

const CATEGORY_TARGETS: Record<PurCuratedCategory, number> = {
  workflow: 5, power_tool: 3, thread: 2, video: 1, spotlight: 1,
};
const TASTE_PROFILE_PATH = path.join(process.cwd(), 'data', 'pur', 'taste_profile.md');
const VALID_CATEGORIES = new Set<PurCuratedCategory>(['workflow', 'power_tool', 'thread', 'video', 'spotlight']);

interface DbFind {
  id: string; source_id: string | null; external_id: string; url: string;
  title: string | null; author: string | null; content_hash: string;
  raw_json: string | null; snippet: string | null; engagement_score: number;
  published_at: number | null; scraped_at: number; dedup_group_id: string | null; status: string;
}
interface ClaudePick {
  find_id: string; category: string; justification: string; rank: number;
}

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) { console.error('[curator] Telegram send failed:', err); }
}

function rowToFind(row: DbFind): PurFind {
  return {
    id: row.id, sourceId: row.source_id, externalId: row.external_id,
    url: row.url, title: row.title, author: row.author,
    contentHash: row.content_hash, rawJson: row.raw_json, snippet: row.snippet,
    engagementScore: row.engagement_score, publishedAt: row.published_at,
    scrapedAt: row.scraped_at, dedupGroupId: row.dedup_group_id,
    status: row.status as PurFind['status'],
  };
}

function fetchCandidates(): PurFind[] {
  const db = getAgentHubDatabase();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  let rows = db.prepare(
    `SELECT * FROM pur_finds WHERE scraped_at > ? AND status = 'active' ORDER BY engagement_score DESC LIMIT 40`
  ).all(sevenDaysAgo) as DbFind[];
  if (rows.length < 20) {
    console.log('[curator] < 20 in 7-day window, extending to 14 days...');
    rows = db.prepare(
      `SELECT * FROM pur_finds WHERE scraped_at > ? AND status = 'active' ORDER BY engagement_score DESC LIMIT 40`
    ).all(fourteenDaysAgo) as DbFind[];
  }
  return rows.map(rowToFind);
}

function deduplicateCandidates(candidates: PurFind[]): PurFind[] {
  const grouped = new Map<string, PurFind>();
  const ungrouped: PurFind[] = [];
  for (const find of candidates) {
    if (!find.dedupGroupId) { ungrouped.push(find); continue; }
    const existing = grouped.get(find.dedupGroupId);
    if (!existing || find.engagementScore > existing.engagementScore) {
      grouped.set(find.dedupGroupId, find);
    }
  }
  return [...grouped.values(), ...ungrouped];
}

function enforceCreatorQuota(candidates: PurFind[]): PurFind[] {
  const authorCount = new Map<string, number>();
  return candidates.filter(find => {
    if (!find.author) return true;
    const count = authorCount.get(find.author) ?? 0;
    if (count >= 2) return false;
    authorCount.set(find.author, count + 1);
    return true;
  });
}

async function callClaude(tasteProfile: string, candidates: PurFind[]): Promise<ClaudePick[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY required for curation');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic({ apiKey });

  const candidateList = candidates
    .map((f, i) =>
      `${i + 1}. id=${f.id} | title=${f.title ?? 'untitled'} | author=${f.author ?? 'unknown'} | score=${f.engagementScore.toFixed(1)} | url=${f.url}${f.snippet ? ` | snippet="${f.snippet.slice(0, 150)}"` : ''}`
    ).join('\n');

  const totalTarget = Object.values(CATEGORY_TARGETS).reduce((a, b) => a + b, 0);
  const categorySpec = Object.entries(CATEGORY_TARGETS).map(([c, n]) => `  - ${c}: ${n}`).join('\n');

  const prompt = `You are the curator for the Power User Report, a weekly newsletter for Claude Code power users.\n\n## Taste Profile\n${tasteProfile}\n\n## Category Targets (total: ${totalTarget} picks)\n${categorySpec}\n\n## Candidates\n${candidateList}\n\nPick the best ${totalTarget} items. Assign each to one of: workflow, power_tool, thread, video, spotlight. Max 2 picks from same author.`;

  const returnPicksTool = {
    name: 'return_picks',
    description: 'Return the curated picks for the week',
    input_schema: {
      type: 'object' as const,
      properties: {
        picks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              find_id: { type: 'string' },
              category: { type: 'string', enum: ['workflow', 'power_tool', 'thread', 'video', 'spotlight'] },
              justification: { type: 'string' },
              rank: { type: 'number' },
            },
            required: ['find_id', 'category', 'justification', 'rank'],
          },
        },
      },
      required: ['picks'],
    },
  };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [returnPicksTool],
    tool_choice: { type: 'any' },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolBlock = response.content.find(
    (block: { type: string }) => block.type === 'tool_use'
  ) as { type: 'tool_use'; input: { picks: ClaudePick[] } } | undefined;

  if (!toolBlock?.input?.picks) {
    throw new Error('Claude did not return a valid tool_use response with picks');
  }
  return toolBlock.input.picks;
}

function validatePicks(picks: ClaudePick[], candidateIds: Set<string>): ClaudePick[] {
  const db = getAgentHubDatabase();
  const categoryCounts: Partial<Record<PurCuratedCategory, number>> = {};
  const authorCounts = new Map<string, number>();
  const validated: ClaudePick[] = [];

  for (const pick of picks) {
    if (!VALID_CATEGORIES.has(pick.category as PurCuratedCategory)) {
      console.warn(`[curator] Invalid category: ${pick.category}`); continue;
    }
    if (!candidateIds.has(pick.find_id)) {
      console.warn(`[curator] Unknown find_id: ${pick.find_id}`); continue;
    }
    const cat = pick.category as PurCuratedCategory;
    if ((categoryCounts[cat] ?? 0) >= CATEGORY_TARGETS[cat]) {
      console.warn(`[curator] Category ${cat} over quota`); continue;
    }
    const findRow = db.prepare('SELECT author FROM pur_finds WHERE id = ?').get(pick.find_id) as { author: string | null } | undefined;
    const author = findRow?.author ?? null;
    if (author) {
      const aCount = authorCounts.get(author) ?? 0;
      if (aCount >= 2) { console.warn(`[curator] Author "${author}" over quota`); continue; }
      authorCounts.set(author, aCount + 1);
    }
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    validated.push(pick);
  }
  return validated;
}

export async function runCurator(weekIso: string): Promise<CurationBatch> {
  let tasteProfile: string;
  try { tasteProfile = fs.readFileSync(TASTE_PROFILE_PATH, 'utf8'); }
  catch (err) { throw new Error(`Failed to load taste profile: ${String(err)}`); }

  const rawCandidates = fetchCandidates();
  console.log(`[curator] ${rawCandidates.length} raw candidates`);

  const candidates = enforceCreatorQuota(deduplicateCandidates(rawCandidates));
  console.log(`[curator] ${candidates.length} candidates after dedup + quota filter`);

  if (candidates.length === 0) {
    console.warn('[curator] No candidates available');
    return { weekIso, candidates: [], selected: [], totalCandidates: 0, createdAt: Date.now() };
  }

  const rawPicks = await callClaude(tasteProfile, candidates);
  console.log(`[curator] Claude returned ${rawPicks.length} picks`);

  const candidateIds = new Set(candidates.map(c => c.id));
  const validatedPicks = validatePicks(rawPicks, candidateIds);
  console.log(`[curator] ${validatedPicks.length} picks after validation`);

  const db = getAgentHubDatabase();
  const selected: PurCurated[] = [];
  const now = Date.now();

  for (const pick of validatedPicks) {
    const id = generatePurId('curated');
    try {
      db.prepare(`
        INSERT OR IGNORE INTO pur_curated
          (id, week_iso, find_id, rank, category, justification, mike_approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).run(id, weekIso, pick.find_id, pick.rank, pick.category, pick.justification, now);
      selected.push({
        id, weekIso, findId: pick.find_id, rank: pick.rank,
        category: pick.category as PurCuratedCategory,
        justification: pick.justification, mikeApproved: false, createdAt: now,
      });
    } catch (err) { console.error(`[curator] Insert failed for ${pick.find_id}:`, err); }
  }

  const findMap = new Map(candidates.map(c => [c.id, c]));
  const lines = selected
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((c, i) => {
      const find = findMap.get(c.findId ?? '');
      return `${i + 1}. [${c.category}] ${find?.title ?? c.findId} \u2014 ${find?.url ?? ''}`;
    }).join('\n');

  await sendTelegram(
    `\u{1F4CB} Curator \u2014 Week ${weekIso} picks ready for approval:\n${lines}\n\nReact \u2705 to approve all or reply to this chat with changes.`
  );

  return { weekIso, candidates, selected, totalCandidates: candidates.length, createdAt: now };
}

export async function main(): Promise<void> {
  const weekIso = currentWeekIso();
  console.log(`[curator] Starting PUR Curator for ${weekIso}...`);
  try {
    const batch = await runCurator(weekIso);
    console.log(`[curator] Done: ${batch.selected.length} picks from ${batch.totalCandidates} candidates`);
  } catch (err) {
    console.error('[curator] Fatal error:', err);
    await sendTelegram(`\u26A0\uFE0F Curator FAILED for ${weekIso}: ${String(err)}`);
    process.exit(1);
  }
}
