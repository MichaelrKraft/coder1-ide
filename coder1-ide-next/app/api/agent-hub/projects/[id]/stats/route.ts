import { NextRequest, NextResponse } from 'next/server';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = params;
  const db = getAgentHubDatabase();

  const agents = db.prepare(
    `SELECT id, name, role, status FROM agent_hub_agents WHERE project_id = ? AND user_id = ?`
  ).all(projectId, userId) as { id: string; name: string; role: string; status: string }[];

  const tasks = db.prepare(
    `SELECT id, title, status, priority FROM agent_hub_tasks WHERE project_id = ? AND user_id = ?`
  ).all(projectId, userId) as { id: string; title: string; status: string; priority: string }[];

  const agentIds = agents.map(a => a.id);
  let totalRuns = 0;
  let totalCostCents = 0;

  if (agentIds.length > 0) {
    const placeholders = agentIds.map(() => '?').join(',');
    const row = db.prepare(
      `SELECT COUNT(*) as runs, COALESCE(SUM(cost_cents), 0) as cost FROM agent_hub_runs WHERE agent_id IN (${placeholders})`
    ).get(...agentIds) as { runs: number; cost: number };
    totalRuns = row.runs;
    totalCostCents = row.cost;
  }

  return NextResponse.json({ agents, tasks, totalRuns, totalCostCents });
}
