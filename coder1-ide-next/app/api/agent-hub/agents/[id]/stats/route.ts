import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const db = getAgentHubDatabase();

  try {
    // Latest run
    const latestRun = db.prepare(`
      SELECT id, status, started_at, completed_at, cost_cents, error_summary,
             input_tokens, output_tokens, cache_read_tokens
      FROM agent_hub_runs WHERE agent_id = ? AND user_id = ?
      ORDER BY started_at DESC LIMIT 1
    `).get(id, userId) as {
      id: string;
      status: string;
      started_at: string;
      completed_at: string | null;
      cost_cents: number;
      error_summary: string | null;
      input_tokens: number | null;
      output_tokens: number | null;
      cache_read_tokens: number | null;
    } | undefined;

    // Token usage totals
    const tokenRow = db.prepare(`
      SELECT COALESCE(SUM(input_tokens), 0) as total_input,
             COALESCE(SUM(output_tokens), 0) as total_output,
             COALESCE(SUM(cache_read_tokens), 0) as total_cache_read
      FROM agent_hub_runs WHERE agent_id = ? AND user_id = ?
    `).get(id, userId) as { total_input: number; total_output: number; total_cache_read: number };

    // Run activity: runs per day, last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const runActivity = db.prepare(`
      SELECT date(started_at) as date,
        SUM(CASE WHEN status IN ('approved', 'completed') THEN 1 ELSE 0 END) as succeeded,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM agent_hub_runs
      WHERE agent_id = ? AND user_id = ? AND date(started_at) >= ?
      GROUP BY date(started_at)
      ORDER BY date ASC
    `).all(id, userId, fourteenDaysAgo) as {
      date: string;
      succeeded: number;
      failed: number;
    }[];

    // Tasks by priority
    const tasksByPriority = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM agent_hub_tasks WHERE agent_id = ? AND user_id = ?
      GROUP BY priority
    `).all(id, userId) as { priority: string; count: number }[];

    // Tasks by status
    const tasksByStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM agent_hub_tasks WHERE agent_id = ? AND user_id = ?
      GROUP BY status
    `).all(id, userId) as { status: string; count: number }[];

    // Success rate
    const successRate = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('approved', 'completed') THEN 1 ELSE 0 END) as succeeded
      FROM agent_hub_runs WHERE agent_id = ? AND user_id = ?
    `).get(id, userId) as { total: number; succeeded: number };

    // Total spent
    const spentRow = db.prepare(`
      SELECT COALESCE(SUM(cost_cents), 0) as total
      FROM agent_hub_runs WHERE agent_id = ? AND user_id = ?
    `).get(id, userId) as { total: number };

    // Recent tasks - last 5
    const recentTasks = db.prepare(`
      SELECT id, title, status, priority, created_at
      FROM agent_hub_tasks WHERE agent_id = ? AND user_id = ?
      ORDER BY created_at DESC LIMIT 5
    `).all(id, userId);

    // Stuck run detection: active run with no log activity for 10+ minutes
    const STUCK_THRESHOLD_MS = 10 * 60 * 1000;
    const activeRun = db.prepare(`
      SELECT r.id, r.started_at,
        (SELECT MAX(created_at) FROM agent_hub_run_log_chunks WHERE run_id = r.id) as last_activity
      FROM agent_hub_runs r
      WHERE r.agent_id = ? AND r.status = 'running'
      ORDER BY r.started_at DESC LIMIT 1
    `).get(id, userId) as {
      id: string;
      started_at: string;
      last_activity: string | null;
    } | undefined;

    let stuckRun: {
      runId: string;
      startedAt: string;
      lastActivity: string | null;
      minutesIdle: number;
    } | null = null;

    if (activeRun) {
      const referenceTime = activeRun.last_activity || activeRun.started_at;
      const idleMs = Date.now() - new Date(referenceTime).getTime();
      if (idleMs > STUCK_THRESHOLD_MS) {
        stuckRun = {
          runId: activeRun.id,
          startedAt: activeRun.started_at,
          lastActivity: activeRun.last_activity,
          minutesIdle: Math.floor(idleMs / 60000),
        };
      }
    }

    return NextResponse.json({
      latestRun: latestRun ?? null,
      runActivity,
      tasksByPriority: Object.fromEntries(
        tasksByPriority.map((r) => [r.priority, r.count])
      ),
      tasksByStatus: Object.fromEntries(
        tasksByStatus.map((r) => [r.status, r.count])
      ),
      successRate: {
        total: successRate.total,
        succeeded: successRate.succeeded,
      },
      totalSpentCents: spentRow.total,
      tokenUsage: {
        input: tokenRow.total_input,
        output: tokenRow.total_output,
        cacheRead: tokenRow.total_cache_read,
      },
      recentTasks,
      stuckRun,
    });
  } catch (err: unknown) {
    console.error(
      '[agent-stats] error:',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
