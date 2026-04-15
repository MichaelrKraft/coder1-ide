'use strict';
/**
 * collect-weekly-stats.js
 * Usage: node scripts/morning-brief/collect-weekly-stats.js [YYYY-MM-DD]
 *
 * Reads ~/.claude/stats-cache.json (dailyModelTokens) for the last 7 days,
 * calculates what that usage would cost on the Anthropic API, patches
 * public/morning-briefs/brief-data-{date}.json, and prints a summary.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOME     = process.env.HOME;
const ROOT     = path.resolve(__dirname, '../../');
const dateArg  = process.argv[2] || new Date().toISOString().split('T')[0];

// ─── Anthropic API pricing ($ per million tokens) ────────────────────────────
// Source: https://www.anthropic.com/pricing (April 2026)
// dailyModelTokens = input_tokens + output_tokens (no cache)
// We split using historical ratio: ~20% input, ~80% output for Claude Code
const PRICING = {
  'claude-opus-4-6':            { input: 15,   output: 75  },
  'claude-opus-4-5-20251101':   { input: 15,   output: 75  },
  'claude-sonnet-4-6':          { input: 3,    output: 15  },
  'claude-sonnet-4-5-20250929': { input: 3,    output: 15  },
  'claude-haiku-4-5-20251001':  { input: 0.80, output: 4   },
};
const DEFAULT_PRICING = { input: 3, output: 15 }; // Sonnet as fallback

const INPUT_RATIO  = 0.20; // ~20% of non-cache tokens are input
const OUTPUT_RATIO = 0.80; // ~80% of non-cache tokens are output

// ─── Date helpers ─────────────────────────────────────────────────────────────
function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

// ─── Load stats-cache ─────────────────────────────────────────────────────────
function loadStatsCache() {
  const p = path.join(HOME, '.claude', 'stats-cache.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn('[weekly-stats] stats-cache.json not found or unreadable:', e.message);
    return null;
  }
}

// ─── Calculate weekly cost ────────────────────────────────────────────────────
function calcWeeklyCost(cache) {
  const cutoff = sevenDaysAgo();
  const entries = (cache.dailyModelTokens || []).filter(e => e.date >= cutoff);

  if (entries.length === 0) return null;

  let totalCost = 0;

  for (const entry of entries) {
    for (const [model, totalTokens] of Object.entries(entry.tokensByModel || {})) {
      const pricing = PRICING[model] || DEFAULT_PRICING;
      const inputT  = totalTokens * INPUT_RATIO;
      const outputT = totalTokens * OUTPUT_RATIO;
      totalCost += (inputT / 1_000_000) * pricing.input
                 + (outputT / 1_000_000) * pricing.output;
    }
  }

  return Math.round(totalCost * 100) / 100; // round to cents
}

// ─── Read Max plan quota % from cached file ───────────────────────────────────
// Updated by running: update-brief-quota <pct-used>
// e.g. after checking /usage in Claude Code and seeing "29% used", run: update-brief-quota 29
function readSubscriptionPct() {
  const p = path.join(HOME, '.claude', 'morning-brief-quota.json');
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const pctUsed = typeof data.weekPctUsed === 'number' ? data.weekPctUsed : null;
    if (pctUsed === null) return { pctRemaining: null, updatedAt: null };
    return {
      pctRemaining: Math.max(0, 100 - pctUsed), // convert "% used" → "% remaining"
      updatedAt: data.updatedAt || null,
    };
  } catch {
    return { pctRemaining: null, updatedAt: null }; // file doesn't exist yet — show "—" in brief
  }
}

// ─── Tool calls this week ────────────────────────────────────────────────────
function calcWeeklyToolCalls(cache) {
  const cutoff = sevenDaysAgo();
  const entries = (cache.dailyActivity || []).filter(e => e.date >= cutoff);
  if (entries.length === 0) return null;
  return entries.reduce((sum, e) => sum + (e.toolCallCount || 0), 0);
}

// ─── Git commits this week ─────────────────────────────────────────────────────
function getGitCommits() {
  try {
    const out = execSync(
      "git -C ~/autonomous_vibe_interface log --oneline --since='7 days ago' 2>/dev/null | wc -l",
      { shell: '/bin/bash', encoding: 'utf8' }
    );
    return parseInt(out.trim(), 10) || 0;
  } catch {
    return null;
  }
}

// ─── Patch brief-data JSON ────────────────────────────────────────────────────
function patchBriefData(dateStr, weeklyStats) {
  const p = path.join(ROOT, 'public', 'morning-briefs', `brief-data-${dateStr}.json`);
  if (!fs.existsSync(p)) {
    console.warn(`[weekly-stats] brief-data-${dateStr}.json not found — skipping patch`);
    return false;
  }
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    data.weeklyStats = { ...data.weeklyStats, ...weeklyStats };
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[weekly-stats] Failed to patch brief-data:', e.message);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(function main() {
  console.log(`[weekly-stats] Collecting for ${dateArg}...`);

  const cache      = loadStatsCache();
  const gitCommits = getGitCommits();

  let claudeCodeCost   = null;
  let toolCallsThisWeek = null;
  if (cache) {
    claudeCodeCost    = calcWeeklyCost(cache);
    toolCallsThisWeek = calcWeeklyToolCalls(cache);
  }

  const weeklyStats = { claudeCodeCost, toolCallsThisWeek, gitCommits };

  console.log('[weekly-stats] Result:', JSON.stringify(weeklyStats));
  console.log(`  claudeCodeCost:    $${claudeCodeCost ?? '—'}`);
  console.log(`  toolCallsThisWeek: ${toolCallsThisWeek ?? '—'}`);
  console.log(`  gitCommits:        ${gitCommits ?? '—'}`);

  const patched = patchBriefData(dateArg, weeklyStats);
  if (patched) {
    console.log(`[weekly-stats] Patched brief-data-${dateArg}.json`);
  }
})();
