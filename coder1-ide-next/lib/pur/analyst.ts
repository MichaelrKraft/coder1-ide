/**
 * PUR Analyst — aggregates weekly Discord and Coder1 conversion metrics
 * and writes an Obsidian scorecard.
 */

import fs from 'fs';
import path from 'path';
import { getAgentHubDatabase } from '../agent-hub/db';
import { currentWeekIso } from './helpers';

// ================================================================================
// Telegram
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
    console.warn('[analyst] Telegram failed:', err);
  }
}

// ================================================================================
// Week boundary helper
// ================================================================================

function weekIsoToMondayUnixMs(weekIso: string): number {
  const [yearStr, weekStr] = weekIso.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4DayOfWeek - 1) + (week - 1) * 7);
  return monday.getTime();
}

// ================================================================================
// PostHog conversions (optional)
// ================================================================================

async function fetchPosthogConversions(weekIso: string): Promise<number> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  if (!apiKey || !projectId) {
    console.log('[analyst] POSTHOG_API_KEY/POSTHOG_PROJECT_ID not set — using 0 conversions');
    return 0;
  }

  try {
    const weekStart = weekIsoToMondayUnixMs(weekIso);
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const dateFrom = new Date(weekStart).toISOString().slice(0, 10);
    const dateTo = new Date(weekEnd).toISOString().slice(0, 10);

    const resp = await fetch(
      `https://app.posthog.com/api/projects/${projectId}/insights/trend/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_from: dateFrom,
          date_to: dateTo,
          events: [{ id: 'trial_started', name: 'trial_started' }],
          properties: [
            {
              key: 'utm_source',
              value: 'pur',
              operator: 'exact',
              type: 'event',
            },
          ],
        }),
      }
    );

    if (!resp.ok) {
      console.warn('[analyst] PostHog API error:', resp.status, '— using 0');
      return 0;
    }

    const data = (await resp.json()) as {
      result?: Array<{ aggregated_value?: number; count?: number }>;
    };
    const result = data?.result?.[0];
    return result?.aggregated_value ?? result?.count ?? 0;
  } catch (err) {
    console.warn('[analyst] PostHog fetch failed — using 0:', err);
    return 0;
  }
}

// ================================================================================
// Obsidian scorecard writer
// ================================================================================

interface MetricRow {
  discordTotal: number;
  verifiedCount: number;
  coder1Conversions: number;
  subscribers: number | null;
  netNew: number | null;
}

function deltaStr(current: number | null, prev: number | null): string {
  if (current === null || prev === null) return 'N/A';
  const delta = current - prev;
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function writeObsidianScorecard(
  weekIso: string,
  current: MetricRow,
  prev: MetricRow | null,
  anomalyFlags: string[]
): void {
  const obsidianDir = '/Users/michaelkraft/Desktop/Businesses/Obsidian Notes/Output';
  try {
    fs.mkdirSync(obsidianDir, { recursive: true });
  } catch {
    // May not exist in non-local environments; continue gracefully
    console.warn('[analyst] Could not create Obsidian output dir — scorecard skipped');
    return;
  }

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const notesSection =
    anomalyFlags.length > 0
      ? anomalyFlags.map(f => `- ${f}`).join('\n')
      : 'All metrics nominal.';

  const scorecard = `# PUR Weekly Scorecard — ${weekIso}

| Metric | This Week | Last Week | Change |
|---|---|---|---|
| Discord Members | ${current.discordTotal} | ${prev?.discordTotal ?? 'N/A'} | ${deltaStr(current.discordTotal, prev?.discordTotal ?? null)} |
| Verified Members | ${current.verifiedCount} | ${prev?.verifiedCount ?? 'N/A'} | ${deltaStr(current.verifiedCount, prev?.verifiedCount ?? null)} |
| Coder1 Conversions | ${current.coder1Conversions} | ${prev?.coder1Conversions ?? 'N/A'} | ${deltaStr(current.coder1Conversions, prev?.coder1Conversions ?? null)} |

## Notes
${notesSection}

*Generated by PUR Analyst — ${timestamp}*
`;

  const scorecardPath = path.join(obsidianDir, `pur-week-${weekIso}.md`);
  fs.writeFileSync(scorecardPath, scorecard, 'utf8');
  console.log(`[analyst] Obsidian scorecard written to ${scorecardPath}`);
}

// ================================================================================
// Main
// ================================================================================

export async function runAnalyst(weekIso: string): Promise<void> {
  const db = getAgentHubDatabase();

  const weekStartMs = weekIsoToMondayUnixMs(weekIso);

  // 1. Discord stats from DB
  const discordTotal = (
    db.prepare(
      `SELECT COUNT(*) AS cnt FROM pur_members WHERE status != 'left'`
    ).get() as { cnt: number }
  ).cnt;

  const verifiedCount = (
    db.prepare(
      `SELECT COUNT(*) AS cnt FROM pur_members WHERE status = 'verified'`
    ).get() as { cnt: number }
  ).cnt;

  const newJoinsThisWeek = (
    db.prepare(
      `SELECT COUNT(*) AS cnt FROM pur_members WHERE created_at > ?`
    ).get(weekStartMs) as { cnt: number }
  ).cnt;

  // 2. PostHog conversions (optional)
  const coder1Conversions = await fetchPosthogConversions(weekIso);

  // 3. Previous week's metrics for WoW delta
  const prevWeekRow = db.prepare(
    `SELECT * FROM pur_metrics WHERE week_iso < ? ORDER BY week_iso DESC LIMIT 1`
  ).get(weekIso) as {
    week_iso: string;
    subscribers: number | null;
    net_new: number | null;
    discord_total: number | null;
    verified_count: number | null;
    coder1_conversions: number | null;
    newsletter_open_rate: number | null;
    recorded_at: number;
  } | undefined;

  const prevMetrics: MetricRow | null = prevWeekRow
    ? {
        discordTotal: prevWeekRow.discord_total ?? 0,
        verifiedCount: prevWeekRow.verified_count ?? 0,
        coder1Conversions: prevWeekRow.coder1_conversions ?? 0,
        subscribers: prevWeekRow.subscribers,
        netNew: prevWeekRow.net_new,
      }
    : null;

  // 4. Anomaly detection
  const anomalyFlags: string[] = [];
  const netNew = prevMetrics ? discordTotal - prevMetrics.discordTotal : newJoinsThisWeek;
  if (netNew < 0) {
    anomalyFlags.push(`RED: Net new members is ${netNew} (Discord member count decreased)`);
  }
  if (coder1Conversions === 0) {
    anomalyFlags.push('WARN: No Coder1 conversions attributed to PUR this week');
  }

  // 5. Upsert pur_metrics
  db.prepare(`
    INSERT INTO pur_metrics (week_iso, discord_total, verified_count, net_new, coder1_conversions, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(week_iso) DO UPDATE SET
      discord_total = excluded.discord_total,
      verified_count = excluded.verified_count,
      net_new = excluded.net_new,
      coder1_conversions = excluded.coder1_conversions,
      recorded_at = excluded.recorded_at
  `).run(weekIso, discordTotal, verifiedCount, netNew, coder1Conversions, Date.now());

  // 6. Obsidian scorecard
  const currentMetrics: MetricRow = {
    discordTotal,
    verifiedCount,
    coder1Conversions,
    subscribers: null,
    netNew,
  };
  writeObsidianScorecard(weekIso, currentMetrics, prevMetrics, anomalyFlags);

  // 7. Telegram summary
  const deltaSuffix = netNew >= 0 ? `+${netNew}` : `${netNew}`;
  await sendTelegram(
    `📊 Week ${weekIso} scorecard: ${discordTotal} Discord members (${deltaSuffix}), ${verifiedCount} verified, ${coder1Conversions} Coder1 conversions.`
  );

  console.log(
    `[analyst] ${weekIso}: discord=${discordTotal} (${deltaSuffix}), verified=${verifiedCount}, conversions=${coder1Conversions}`
  );
}

export async function main(weekIso?: string): Promise<void> {
  const week = weekIso || currentWeekIso();
  console.log(`[analyst] Running for week ${week}`);
  await runAnalyst(week);
}

if (require.main === module) {
  const [, , weekArg] = process.argv;
  main(weekArg).catch(err => {
    console.error('[analyst] Fatal:', err);
    process.exit(1);
  });
}
