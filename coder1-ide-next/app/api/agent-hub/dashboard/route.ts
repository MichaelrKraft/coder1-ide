import { NextRequest, NextResponse } from 'next/server';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAgentHubDatabase();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    // Agent stats
    const agentStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errored
      FROM agent_hub_agents WHERE user_id = ? AND status != 'archived'
    `).get(userId) as { total: number; running: number; idle: number; errored: number };

    // Task stats
    const taskStats = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status IN ('backlog', 'todo') THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as inReview
      FROM agent_hub_tasks WHERE user_id = ?
    `).get(userId) as { inProgress: number; open: number; inReview: number };

    // Monthly spend
    const spendRow = db.prepare(`
      SELECT COALESCE(SUM(cost_cents), 0) as total
      FROM agent_hub_runs WHERE user_id = ? AND started_at >= ?
    `).get(userId, monthStart) as { total: number };

    // Pending approvals
    const approvalRow = db.prepare(`
      SELECT COUNT(*) as cnt FROM agent_hub_runs
      WHERE user_id = ? AND status = 'awaiting_approval'
    `).get(userId) as { cnt: number };

    // Recent runs (for activity feed) - last 15
    const recentRuns = db.prepare(`
      SELECT r.id, r.status, r.started_at, r.completed_at, r.cost_cents,
             a.name as agent_name, t.title as task_title
      FROM agent_hub_runs r
      LEFT JOIN agent_hub_agents a ON r.agent_id = a.id
      LEFT JOIN agent_hub_tasks t ON r.task_id = t.id
      WHERE r.user_id = ?
      ORDER BY r.started_at DESC LIMIT 15
    `).all(userId);

    // Recent tasks - last 10
    const recentTasks = db.prepare(`
      SELECT t.id, t.title, t.status, t.priority, t.created_at,
             a.name as agent_name
      FROM agent_hub_tasks t
      LEFT JOIN agent_hub_agents a ON t.agent_id = a.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC LIMIT 10
    `).all(userId);

    return NextResponse.json({
      stats: {
        agentsEnabled: agentStats.total,
        agentsRunning: agentStats.running,
        agentsIdle: agentStats.idle,
        agentsErrored: agentStats.errored,
        tasksInProgress: taskStats.inProgress,
        tasksOpen: taskStats.open,
        tasksInReview: taskStats.inReview,
        monthSpendCents: spendRow.total,
        pendingApprovals: approvalRow.cnt,
      },
      recentRuns,
      recentTasks,
    });
  } catch (err: unknown) {
    console.error('[dashboard] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
