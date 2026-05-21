import { NextRequest, NextResponse } from 'next/server';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';
import { getAgent } from '@/lib/agent-hub/agents';
import { getTask, updateTask, computeNextRunAt } from '@/lib/agent-hub/tasks';
import { createRun, updateRun } from '@/lib/agent-hub/runs';
import { startAgentRun } from '@/lib/agent-hub/bridge-integration';

export const dynamic = 'force-dynamic';

interface ScheduledRow {
  id: string;
  user_id: string;
  agent_id: string;
  title: string;
  description: string | null;
  schedule_type: string;
  schedule_time: string;
  schedule_day: number | null;
  schedule_enabled: number;
  next_run_at: string;
}

const MISSED_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth: require internal token
  const authHeader = request.headers.get('authorization') ?? '';
  const expectedToken = process.env.AGENT_HUB_INTERNAL_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'Scheduler disabled — AGENT_HUB_INTERNAL_TOKEN not set' },
      { status: 503 }
    );
  }
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAgentHubDatabase();
    const now = new Date();
    const nowIso = now.toISOString();

    const rows = db
      .prepare(
        `SELECT id, user_id, agent_id, title, description, schedule_type, schedule_time, schedule_day, schedule_enabled, next_run_at
         FROM agent_hub_tasks
         WHERE schedule_enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?
         ORDER BY next_run_at ASC`
      )
      .all(nowIso) as ScheduledRow[];

    let fired = 0;
    let skipped = 0;

    for (const row of rows) {
      const nextRunDate = new Date(row.next_run_at);
      const ageMs = now.getTime() - nextRunDate.getTime();

      // Skip missed runs (>2h old) — just recompute nextRunAt
      if (ageMs > MISSED_THRESHOLD_MS) {
        const newNext = computeNextRunAt(
          row.schedule_type as 'daily' | 'weekly' | 'monthly' | 'once',
          row.schedule_time,
          row.schedule_day,
          now
        );
        updateTask(row.id, row.user_id, { nextRunAt: newNext });
        skipped++;
        continue;
      }

      // Fetch agent — skip if archived or missing
      const agent = getAgent(row.agent_id, row.user_id);
      if (!agent || agent.status === 'archived' || agent.status === 'paused') {
        console.warn(`[scheduler] Skipping task ${row.id}: agent ${row.agent_id} unavailable/paused`);
        skipped++;
        continue;
      }

      // Budget check: if monthly budget set and exceeded
      if (agent.monthlyBudgetCents > 0) {
        const monthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
        ).toISOString();
        const budgetRow = db
          .prepare(
            'SELECT COALESCE(SUM(cost_cents), 0) as total FROM agent_hub_runs WHERE agent_id = ? AND started_at >= ?'
          )
          .get(row.agent_id, monthStart) as { total: number };
        if (budgetRow.total >= agent.monthlyBudgetCents) {
          console.warn(`[scheduler] Skipping task ${row.id}: agent ${agent.name} over budget`);
          skipped++;
          continue;
        }
      }

      // Concurrent run check
      if (agent.maxConcurrentRuns <= 1) {
        const runningRow = db
          .prepare(
            "SELECT COUNT(*) as cnt FROM agent_hub_runs WHERE agent_id = ? AND status = 'running'"
          )
          .get(row.agent_id) as { cnt: number };
        if (runningRow.cnt > 0) {
          console.warn(`[scheduler] Skipping task ${row.id}: agent ${agent.name} already running`);
          skipped++;
          continue;
        }
      }

      // Atomically claim this task by advancing next_run_at
      // If another process already claimed it, this returns 0 changes
      const claimed = db
        .prepare(
          `UPDATE agent_hub_tasks SET next_run_at = ? WHERE id = ? AND next_run_at = ?`
        )
        .run(
          row.schedule_type === 'once' ? null : computeNextRunAt(
            row.schedule_type as 'daily' | 'weekly' | 'monthly',
            row.schedule_time,
            row.schedule_day,
            now
          ),
          row.id,
          row.next_run_at  // Only succeeds if no other process changed it
        );

      if (claimed.changes === 0) {
        skipped++;
        continue; // Another scheduler instance already claimed this
      }

      // For 'once' schedules, also disable
      if (row.schedule_type === 'once') {
        db.prepare('UPDATE agent_hub_tasks SET schedule_enabled = 0 WHERE id = ?').run(row.id);
      }

      // Fire the run
      const run = createRun({
        agentId: row.agent_id,
        taskId: row.id,
        userId: row.user_id,
        model: agent.model,
      });

      const result = await startAgentRun({
        runId: run.id,
        agentId: agent.id,
        taskId: row.id,
        userId: row.user_id,
        workspacePath: agent.workspacePath,
        systemPrompt: agent.systemPrompt,
        skills: agent.skills,
        taskTitle: row.title,
        taskDescription: row.description ?? '',
        model: agent.model,
      });

      // Fetch current task to append to runIds (not overwrite)
      const currentTask = getTask(row.id, row.user_id);
      const updatedRunIds = currentTask ? [...currentTask.runIds, run.id] : [run.id];

      if (!result.success) {
        // Bridge unavailable or failed to start — mark the run failed and leave
        // the task in backlog so the UI doesn't show phantom in_progress work.
        console.warn(`[scheduler] Run start failed for task ${row.id}: ${result.error}`);
        updateRun(run.id, row.user_id, {
          status: 'failed',
          errorSummary: result.error,
          completedAt: nowIso,
        });
        updateTask(row.id, row.user_id, {
          status: 'backlog',
          runIds: updatedRunIds,
        });
        skipped++;
        continue;
      }

      // nextRunAt and scheduleEnabled already handled by atomic claim above
      updateTask(row.id, row.user_id, {
        status: 'in_progress',
        startedAt: nowIso,
        runIds: updatedRunIds,
      });
      fired++;
    }

    return NextResponse.json({ fired, skipped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[scheduler] error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
