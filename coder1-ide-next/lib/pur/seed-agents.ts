/**
 * PUR Agent Hub Seeds — inserts 5 PUR agents and their cron tasks (idempotent).
 * Run once or on deploy. Uses INSERT OR IGNORE so re-runs are safe.
 */

import crypto from 'crypto';
import { getAgentHubDatabase } from '../agent-hub/db';

// ================================================================================
// Agent definitions
// ================================================================================

interface PurAgentDef {
  id: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  model: string;
  schedule: string | null;
  schedulePrompt: string | null;
}

const WORKSPACE = process.cwd();

const AGENTS: PurAgentDef[] = [
  {
    id: 'pur-scout',
    name: 'PUR Scout',
    role: 'Content Scout',
    description:
      'Scrapes Reddit, HN, and newsletters daily for Claude Code power user content',
    systemPrompt: `You are the PUR Scout. Run the scout: cd ${WORKSPACE} && npx tsx lib/pur/scout.ts`,
    model: 'claude-haiku-4-5-20251001',
    schedule: '0 18 * * *', // 11am MT (MDT UTC-6) = 18:00 UTC (summer)
    schedulePrompt:
      "Run PUR Scout to collect today's Claude Code content from Reddit, HN, and newsletters.",
  },
  {
    id: 'pur-curator',
    name: 'PUR Curator',
    role: 'Content Curator',
    description:
      "Picks the best 12 finds for the week using taste profile and Claude AI",
    systemPrompt: `You are the PUR Curator. Run: cd ${WORKSPACE} && npx tsx lib/pur/curator.ts`,
    model: 'claude-sonnet-4-6',
    schedule: '0 15 * * 3', // Wednesday 9am MT = 15:00 UTC
    schedulePrompt:
      "Run PUR Curator to pick this week's best content for the newsletter.",
  },
  {
    id: 'pur-drafter',
    name: 'PUR Drafter',
    role: 'Newsletter Drafter',
    description: 'Assembles the weekly newsletter draft from curated items',
    systemPrompt: `You are the PUR Drafter. Run: cd ${WORKSPACE} && npx tsx lib/pur/drafter.ts`,
    model: 'claude-sonnet-4-6',
    schedule: '0 17 * * 3', // Wednesday 11am MT = 17:00 UTC
    schedulePrompt:
      "Run PUR Drafter to generate this week's newsletter draft from approved curations.",
  },
  {
    id: 'pur-distributor',
    name: 'PUR Distributor',
    role: 'Content Distributor',
    description:
      "Posts Twitter thread, LinkedIn draft, and Discord announcement after Mike publishes to Substack",
    systemPrompt:
      "You are the PUR Distributor. Wait for Mike's /pur-shipped signal then distribute.",
    model: 'claude-sonnet-4-6',
    schedule: null, // Mike-triggered only
    schedulePrompt: null,
  },
  {
    id: 'pur-analyst',
    name: 'PUR Analyst',
    role: 'Analytics Reporter',
    description:
      'Compiles weekly Discord and Coder1 conversion metrics into an Obsidian scorecard',
    systemPrompt: `You are the PUR Analyst. Run: cd ${WORKSPACE} && npx tsx lib/pur/analyst.ts`,
    model: 'claude-haiku-4-5-20251001',
    schedule: '0 2 * * 1', // Sunday 8pm MT = Monday 02:00 UTC
    schedulePrompt: 'Run PUR Analyst to generate the weekly metrics scorecard.',
  },
];

// ================================================================================
// Seed function
// ================================================================================

export function seedPurAgents(): void {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();

  let agentsInserted = 0;
  let cronInserted = 0;

  for (const agent of AGENTS) {
    // Insert agent (idempotent)
    const result = db.prepare(`
      INSERT OR IGNORE INTO agent_hub_agents (
        id, user_id, name, role, description, system_prompt,
        skills, workspace_path, model,
        monthly_budget_cents, max_concurrent_runs,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      agent.id,
      'system',
      agent.name,
      agent.role,
      agent.description,
      agent.systemPrompt,
      '[]',
      WORKSPACE,
      agent.model,
      0,       // monthly_budget_cents — no spend cap for system agents
      1,       // max_concurrent_runs
      'idle',
      now,
      now
    );

    if (result.changes > 0) agentsInserted++;

    // Insert cron task for scheduled agents (check first — table has no unique on agent_id)
    if (agent.schedule && agent.schedulePrompt) {
      const existing = db.prepare(
        `SELECT id FROM agent_hub_cron_tasks WHERE agent_id = ? AND status = 'active' LIMIT 1`
      ).get(agent.id);

      if (!existing) {
        const taskId = crypto.randomUUID();
        const runId = crypto.randomUUID();

        db.prepare(`
          INSERT INTO agent_hub_cron_tasks (
            id, user_id, agent_id, run_id, schedule, prompt, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          taskId,
          'system',
          agent.id,
          runId,
          agent.schedule,
          agent.schedulePrompt,
          'active'
        );

        cronInserted++;
      }
    }
  }

  console.log(
    `[seed-agents] Seeded ${agentsInserted} new agents, ${cronInserted} new cron tasks` +
    ` (${AGENTS.length - agentsInserted} agents already existed)`
  );
}

export function main(): void {
  seedPurAgents();
}

if (require.main === module) {
  main();
}
