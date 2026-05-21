/**
 * PUR Drafter — turns approved pur_curated rows into a Markdown newsletter draft.
 * Runs after curator approval. Idempotent: skips if draft already exists.
 */

import fs from 'fs';
import path from 'path';
import { getAgentHubDatabase } from '../agent-hub/db';
import { generatePurId, appendMorningBriefSection, currentWeekIso } from './helpers';
import type { NewsletterDraft, PurCuratedCategory } from '../../types/pur';

const Anthropic = require('@anthropic-ai/sdk').default;

// ================================================================================
// Types for raw DB rows
// ================================================================================

interface CuratedWithFind {
  curated_id: string;
  week_iso: string;
  find_id: string;
  rank: number;
  category: PurCuratedCategory;
  justification: string;
  url: string;
  title: string | null;
  author: string | null;
  snippet: string | null;
}

// ================================================================================
// Helpers
// ================================================================================

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
  } catch (err) {
    console.warn('[drafter] Telegram notification failed:', err);
  }
}

async function validateUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return resp.status < 400;
  } catch {
    return false;
  }
}

function weekIsoToDate(weekIso: string): Date {
  // Parse "YYYY-Www" → the Monday of that week
  const [yearStr, weekStr] = weekIso.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7; // Mon=1 … Sun=7
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4DayOfWeek - 1) + (week - 1) * 7);
  return monday;
}

function formatWeekDate(weekIso: string): string {
  const monday = weekIsoToDate(weekIso);
  // Find the Friday (newsletter send day)
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  return friday.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ================================================================================
// Claude helpers
// ================================================================================

async function generateItemDescription(
  item: CuratedWithFind,
  tasteProfile: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  const systemPrompt = `You write newsletter item descriptions for "The Claude Code Power User Report."
Voice guide from editor's taste profile:
${tasteProfile}

Voice rules:
- Second-person direct ("Here's exactly what this does for you")
- Opinionated and concrete — no hedge words
- No exclamation marks
- Specific and actionable, not vague
- Max 2-3 sentences`;

  const userPrompt = `Write a 2-3 sentence description for this newsletter item.

Title: ${item.title || 'Untitled'}
Author: ${item.author || 'Unknown'}
Snippet: ${item.snippet || '(no snippet)'}
Curator note: ${item.justification || ''}

Output only the 2-3 sentence description, no intro, no quotes.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = msg.content[0];
    return block.type === 'text' ? block.text.trim() : item.snippet || '';
  } catch (err) {
    console.warn('[drafter] Claude description failed for', item.url, err);
    return item.snippet || item.justification || '(description unavailable)';
  }
}

async function generateSubjectLines(bodyMd: string): Promise<[string, string, string]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  const userPrompt = `Generate 3 subject line options for this newsletter issue.
Rules: specific, no clickbait, under 55 chars each, no punctuation at end.
Respond with exactly 3 lines, each starting with the line number and a period.

Newsletter body (first 600 chars):
${bodyMd.slice(0, 600)}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = msg.content[0];
    if (block.type !== 'text') {
      return defaultSubjectLines();
    }
    const lines = block.text
      .split('\n')
      .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
      .filter((l: string) => l.length > 0);
    const s1 = lines[0] || defaultSubjectLines()[0];
    const s2 = lines[1] || defaultSubjectLines()[1];
    const s3 = lines[2] || defaultSubjectLines()[2];
    return [s1, s2, s3];
  } catch (err) {
    console.warn('[drafter] Subject line generation failed:', err);
    return defaultSubjectLines();
  }
}

function defaultSubjectLines(): [string, string, string] {
  return [
    'The Claude Code Power User Report',
    'This week in Claude Code',
    'Claude Code workflows, MCPs, and tools',
  ];
}

// ================================================================================
// Newsletter assembly
// ================================================================================

function assembleSections(
  items: Array<CuratedWithFind & { description: string; urlValid: boolean }>
): string {
  const byCategory = new Map<PurCuratedCategory, typeof items>();
  for (const item of items) {
    const existing = byCategory.get(item.category) || [];
    existing.push(item);
    byCategory.set(item.category, existing);
  }

  const sections: string[] = [];

  // Workflow of the Week
  const workflows = byCategory.get('workflow') || [];
  if (workflows.length > 0) {
    const w = workflows[0];
    const linkText = w.urlValid ? w.url : `${w.url} [DEAD LINK]`;
    sections.push(
      `## Workflow of the Week\n\n**${w.title || 'Untitled'}**\n\n${w.description}\n\n[Read more](${linkText})\n`
    );
  }

  // Power Tools Corner
  const tools = byCategory.get('power_tool') || [];
  if (tools.length > 0) {
    const toolItems = tools
      .slice(0, 3)
      .map(t => {
        const linkText = t.urlValid ? t.url : `${t.url} [DEAD LINK]`;
        return `**[${t.title || 'Untitled'}](${linkText})**\n${t.description}`;
      })
      .join('\n\n');
    sections.push(`## Power Tools Corner\n\n*MCPs, CLI tools & Claude Code skills worth knowing.*\n\n${toolItems}\n`);
  }

  // Worth Reading (threads, articles, videos)
  const readable = [
    ...(byCategory.get('thread') || []),
    ...(byCategory.get('video') || []),
  ].slice(0, 3);
  if (readable.length > 0) {
    const readItems = readable
      .map(r => {
        const linkText = r.urlValid ? r.url : `${r.url} [DEAD LINK]`;
        return `**[${r.title || 'Untitled'}](${linkText})**\n${r.description}`;
      })
      .join('\n\n');
    sections.push(`## Worth Reading\n\n${readItems}\n`);
  }

  // Community Spotlight
  const spotlights = byCategory.get('spotlight') || [];
  if (spotlights.length > 0) {
    const s = spotlights[0];
    const linkText = s.urlValid ? s.url : `${s.url} [DEAD LINK]`;
    sections.push(
      `## Community Spotlight\n\n**[${s.title || 'Untitled'}](${linkText})**\n\n${s.description}\n`
    );
  }

  return sections.join('\n---\n\n');
}

function assembleNewsletter(
  weekIso: string,
  sections: string
): string {
  const dateStr = formatWeekDate(weekIso);
  const cta = `[Start free trial →](https://coder1.ai?utm_source=pur&utm_medium=newsletter&utm_campaign=${weekIso})`;

  return `# The Claude Code Power User Report — ${dateStr}

*Weekly curation for serious Claude Code users.*

---

${sections}

---

## From the Editor

[MIKE'S ESSAY — ~300 WORDS]

*—Mike Kraft, Coder1 IDE*

---

## Try Coder1

The tools covered this week work even better inside Coder1 IDE, where your agents, memory, and workflows live in one place.
${cta}

---
*Unsubscribe | View in browser*
`;
}

// ================================================================================
// Main
// ================================================================================

export async function runDrafter(weekIso: string): Promise<NewsletterDraft> {
  const db = getAgentHubDatabase();

  // 1. Pull approved curated rows joined with finds
  const rows = db.prepare(`
    SELECT
      c.id AS curated_id,
      c.week_iso,
      c.find_id,
      c.rank,
      c.category,
      c.justification,
      f.url,
      f.title,
      f.author,
      f.snippet
    FROM pur_curated c
    JOIN pur_finds f ON f.id = c.find_id
    WHERE c.week_iso = ? AND c.mike_approved = 1
    ORDER BY c.rank ASC
  `).all(weekIso) as CuratedWithFind[];

  // 2. Guard: no approved rows
  if (rows.length === 0) {
    throw new Error(
      `No approved curations for ${weekIso} — run curator and get Mike's approval first`
    );
  }

  // 3. Idempotency check
  const existing = db.prepare(
    `SELECT id, draft_path, subject FROM pur_newsletters WHERE week_iso = ?`
  ).get(weekIso) as { id: string; draft_path: string | null; subject: string | null } | undefined;

  if (existing?.draft_path) {
    console.log(`[drafter] Draft already exists for ${weekIso} at ${existing.draft_path} — skipping`);
    const bodyMd = fs.readFileSync(existing.draft_path, 'utf8');
    return {
      weekIso,
      subject: existing.subject || defaultSubjectLines()[0],
      bodyMd,
      sections: [],
      draftPath: existing.draft_path,
      createdAt: Date.now(),
    };
  }

  // 4. Read taste profile for voice guidance
  const tasteProfilePath = path.join(process.cwd(), 'data', 'pur', 'taste_profile.md');
  let tasteProfile = '';
  try {
    tasteProfile = fs.readFileSync(tasteProfilePath, 'utf8');
  } catch {
    console.warn('[drafter] taste_profile.md not found — proceeding without voice guidance');
  }

  // 5 + 6. Generate descriptions + validate URLs (parallel per item)
  const enriched = await Promise.all(
    rows.map(async (item) => {
      const [description, urlValid] = await Promise.all([
        generateItemDescription(item, tasteProfile),
        validateUrl(item.url),
      ]);
      return { ...item, description, urlValid };
    })
  );

  // 7. Assemble newsletter body
  const sectionsText = assembleSections(enriched);
  const bodyMd = assembleNewsletter(weekIso, sectionsText);

  // 8. Generate subject lines
  const [s1, s2, s3] = await generateSubjectLines(bodyMd);

  // 9. Save draft file
  const draftsDir = path.join(process.cwd(), 'data', 'pur', 'drafts');
  fs.mkdirSync(draftsDir, { recursive: true });
  const draftPath = path.join(draftsDir, `${weekIso}.md`);
  fs.writeFileSync(draftPath, bodyMd, 'utf8');

  // 10. Upsert pur_newsletters
  const newsletterId = generatePurId('nl');
  const now = Date.now();
  if (existing) {
    db.prepare(
      `UPDATE pur_newsletters SET draft_path = ?, subject = ? WHERE week_iso = ?`
    ).run(draftPath, s1, weekIso);
  } else {
    db.prepare(
      `INSERT INTO pur_newsletters (id, week_iso, draft_path, subject, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(newsletterId, weekIso, draftPath, s1, now);
  }

  // 11. Morning brief
  const todayDate = new Date().toISOString().slice(0, 10);
  const briefHtml = `
<section style="background:#1e293b;border-radius:8px;padding:16px;margin:12px 0;color:#e2e8f0;font-family:sans-serif">
  <h3 style="margin:0 0 8px;color:#38bdf8">PUR Draft Ready — ${weekIso}</h3>
  <p style="margin:0 0 4px">Subject options:</p>
  <ol style="margin:4px 0 8px;padding-left:20px">
    <li>${s1}</li>
    <li>${s2}</li>
    <li>${s3}</li>
  </ol>
  <p style="margin:0 0 4px">Draft: <code>data/pur/drafts/${weekIso}.md</code></p>
  <p style="margin:0"><a href="https://substack.com/publish/post/new" style="color:#38bdf8">Post to Substack →</a></p>
</section>`;
  await appendMorningBriefSection(todayDate, briefHtml);

  // 12. Telegram
  await sendTelegram(
    `📝 Newsletter draft ready for ${weekIso}.\nSubject options:\n1. ${s1}\n2. ${s2}\n3. ${s3}\n\nDraft: data/pur/drafts/${weekIso}.md\nPost to Substack: https://substack.com/publish/post/new`
  );

  return {
    weekIso,
    subject: s1,
    bodyMd,
    sections: [],
    draftPath,
    createdAt: now,
  };
}

export async function main(): Promise<void> {
  const weekIso = currentWeekIso();
  console.log(`[drafter] Running for week ${weekIso}`);
  const draft = await runDrafter(weekIso);
  console.log(`[drafter] Done. Draft at: ${draft.draftPath}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('[drafter] Fatal:', err);
    process.exit(1);
  });
}
