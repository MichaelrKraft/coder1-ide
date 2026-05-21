/**
 * PUR Scout — scrapes configured sources and persists raw finds to the DB.
 * Handles Reddit JSON, HN Algolia, and gracefully skips email sources.
 */

import { getAgentHubDatabase } from '../agent-hub/db';
import { generatePurId, contentHash, computeEngagementScore } from './helpers';
import type { ScoutResult } from '../../types/pur';

interface DbSource {
  id: string; kind: string; handle: string; url: string | null;
  weight: number; active: number; last_scraped_at: number | null; error_count: number;
}
interface RedditPost {
  data: { id: string; title: string; url: string; author: string; selftext: string;
    score: number; num_comments: number; created_utc: number; };
}
interface HnHit {
  objectID: string; title: string; url?: string; author: string;
  points: number; num_comments: number; created_at_i: number;
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
  } catch (err) { console.error('[scout] Telegram send failed:', err); }
}

async function fetchWithRetry(url: string, headers: Record<string, string>): Promise<Response> {
  const res = await fetch(url, { headers });
  if (res.status === 429) {
    console.log('[scout] 429 received, backing off 5s...');
    await new Promise(r => setTimeout(r, 5000));
    return fetch(url, { headers });
  }
  return res;
}

const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

function insertFind(params: {
  sourceId: string; externalId: string; url: string; title: string | null;
  author: string | null; snippet: string | null; rawJson: string;
  upvotes: number; comments: number; publishedAt: number | null; weight: number;
}): boolean {
  const db = getAgentHubDatabase();
  const existing = db
    .prepare('SELECT id FROM pur_finds WHERE source_id = ? AND external_id = ?')
    .get(params.sourceId, params.externalId);
  if (existing) return false;

  const hash = contentHash((params.title ?? '') + params.url);
  const score = computeEngagementScore(
    params.upvotes, params.comments,
    params.publishedAt ?? Date.now(), params.weight
  );
  db.prepare(`
    INSERT INTO pur_finds
      (id, source_id, external_id, url, title, author, content_hash, raw_json,
       snippet, engagement_score, published_at, scraped_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    generatePurId('find'), params.sourceId, params.externalId, params.url,
    params.title, params.author, hash, params.rawJson, params.snippet,
    score, params.publishedAt, Date.now()
  );
  return true;
}

async function scrapeReddit(source: DbSource): Promise<ScoutResult> {
  const result: ScoutResult = {
    sourceId: source.id, itemsFound: 0, itemsNew: 0,
    itemsDuplicate: 0, errors: [], scrapedAt: Date.now(),
  };
  const subreddit = source.handle.replace(/^r\//, '');
  const url = `https://www.reddit.com/r/${subreddit}.json?limit=100&t=day`;

  let response: Response;
  try {
    response = await fetchWithRetry(url, { 'User-Agent': 'PUR-Scout/1.0 (Coder1 IDE content curator)' });
  } catch (err) { result.errors.push(`Fetch failed: ${String(err)}`); return result; }

  if (!response.ok) { result.errors.push(`HTTP ${response.status} from Reddit`); return result; }

  let json: { data?: { children?: RedditPost[] } };
  try { json = await response.json() as typeof json; }
  catch (err) { result.errors.push(`JSON parse failed: ${String(err)}`); return result; }

  const posts = json?.data?.children ?? [];
  result.itemsFound = posts.length;

  for (const post of posts) {
    const d = post.data;
    if (d.score < 10) continue;
    const isNew = insertFind({
      sourceId: source.id, externalId: `t3_${d.id}`, url: d.url,
      title: d.title, author: d.author,
      snippet: d.selftext ? d.selftext.slice(0, 300) : null,
      rawJson: JSON.stringify(d), upvotes: d.score, comments: d.num_comments,
      publishedAt: d.created_utc * 1000, weight: source.weight,
    });
    if (isNew) result.itemsNew++; else result.itemsDuplicate++;
  }
  return result;
}

async function scrapeHn(source: DbSource): Promise<ScoutResult> {
  const result: ScoutResult = {
    sourceId: source.id, itemsFound: 0, itemsNew: 0,
    itemsDuplicate: 0, errors: [], scrapedAt: Date.now(),
  };
  const since = Math.floor((Date.now() - 86_400_000) / 1000);
  const url =
    `https://hn.algolia.com/api/v1/search?query=claude+code` +
    `&tags=story&numericFilters=created_at_i>=${since}&hitsPerPage=100`;

  let response: Response;
  try { response = await fetchWithRetry(url, {}); }
  catch (err) { result.errors.push(`Fetch failed: ${String(err)}`); return result; }

  if (!response.ok) { result.errors.push(`HTTP ${response.status} from HN Algolia`); return result; }

  let json: { hits?: HnHit[] };
  try { json = await response.json() as typeof json; }
  catch (err) { result.errors.push(`JSON parse failed: ${String(err)}`); return result; }

  const hits = json?.hits ?? [];
  result.itemsFound = hits.length;

  for (const hit of hits) {
    if (hit.points < 10) continue;
    const itemUrl = hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;
    const isNew = insertFind({
      sourceId: source.id, externalId: hit.objectID, url: itemUrl,
      title: hit.title, author: hit.author, snippet: null,
      rawJson: JSON.stringify(hit), upvotes: hit.points, comments: hit.num_comments,
      publishedAt: hit.created_at_i * 1000, weight: source.weight,
    });
    if (isNew) result.itemsNew++; else result.itemsDuplicate++;
  }
  return result;
}

export async function runScout(): Promise<ScoutResult[]> {
  const db = getAgentHubDatabase();
  const sources = db.prepare('SELECT * FROM pur_sources WHERE active = 1').all() as DbSource[];
  const results: ScoutResult[] = [];
  let isFirstReddit = true;

  for (const source of sources) {
    if (source.kind === 'email') {
      console.debug(`[scout] Skipping email source: ${source.handle}`);
      continue;
    }
    let result: ScoutResult;
    try {
      if (source.kind === 'reddit') {
        if (!isFirstReddit) await delay(1000);
        isFirstReddit = false;
        result = await scrapeReddit(source);
      } else if (source.kind === 'hn') {
        result = await scrapeHn(source);
      } else {
        console.debug(`[scout] Skipping unimplemented source kind: ${source.kind}`);
        continue;
      }
      db.prepare('UPDATE pur_sources SET last_scraped_at = ? WHERE id = ?')
        .run(Date.now(), source.id);
    } catch (err) {
      console.error(`[scout] Error processing source ${source.id}:`, err);
      db.prepare('UPDATE pur_sources SET error_count = error_count + 1 WHERE id = ?').run(source.id);
      result = {
        sourceId: source.id, itemsFound: 0, itemsNew: 0,
        itemsDuplicate: 0, errors: [String(err)], scrapedAt: Date.now(),
      };
    }
    results.push(result);
  }
  return results;
}

export async function main(): Promise<void> {
  console.log('[scout] Starting PUR Scout run...');
  try {
    const results = await runScout();
    const totalNew = results.reduce((sum, r) => sum + r.itemsNew, 0);
    console.log(`[scout] Complete: ${totalNew} new finds across ${results.length} sources`);
    for (const r of results) {
      console.log(
        `  source=${r.sourceId} found=${r.itemsFound} new=${r.itemsNew}` +
        (r.errors.length ? ` errors=${r.errors.join('; ')}` : '')
      );
    }
    await sendTelegram(
      `\u{1F50D} Scout run complete: ${totalNew} new finds across ${results.length} sources`
    );
  } catch (err) {
    console.error('[scout] Fatal error:', err);
    await sendTelegram(`\u26A0\uFE0F Scout run FAILED: ${String(err)}`);
    process.exit(1);
  }
}
