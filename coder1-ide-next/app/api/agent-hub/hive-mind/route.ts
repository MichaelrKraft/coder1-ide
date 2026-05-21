import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getAgentHubDatabase, getRecentHiveMindEntries } from '@/lib/agent-hub/db';
import { v4 as uuidv4 } from 'uuid';

type HiveMindRow = {
  id: string; user_id: string; agent_id: string; agent_role: string;
  action_type: string; task_title: string; summary: string; outcome: string;
  files_modified: string | null; branch: string | null; run_id: string | null;
  created_at: string; agent_name?: string;
};

/**
 * GET /api/agent-hub/hive-mind
 * List recent hive mind entries for the authenticated user.
 * Query params:
 *   limit (default 50), offset (default 0)
 *   agentId — filter by specific agent
 *   eventType — filter by event_type column
 *   days — look back N days (default 7, max 90)
 *   format=graph — return graph format instead of list
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50'), 200);
  const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0');
  const agentId = request.nextUrl.searchParams.get('agentId');
  const eventType = request.nextUrl.searchParams.get('eventType');
  const daysParam = parseInt(request.nextUrl.searchParams.get('days') ?? '7');
  const days = Math.min(Math.max(daysParam, 1), 90);
  const format = request.nextUrl.searchParams.get('format');

  // Build dynamic WHERE clause
  const conditions: string[] = ['h.user_id = ?', `h.created_at >= datetime('now', '-${days} days')`];
  const params: unknown[] = [userId];
  if (agentId) { conditions.push('h.agent_id = ?'); params.push(agentId); }
  if (eventType) { conditions.push('h.event_type = ?'); params.push(eventType); }
  const whereClause = conditions.join(' AND ');

  try {
    const db = getAgentHubDatabase();

    if (format === 'graph') {
      const rows = db.prepare(
        `SELECT h.*, a.name as agent_name
         FROM agent_hub_hive_mind h
         LEFT JOIN agent_hub_agents a ON h.agent_id = a.id
         WHERE ${whereClause}
         ORDER BY h.created_at DESC`
      ).all(...params) as HiveMindRow[];

      const agentNodes = new Map<string, { id: string; label: string; type: 'agent' | 'task' }>();
      const taskNodes: Array<{ id: string; label: string; type: 'agent' | 'task' }> = [];
      const edges: Array<{ source: string; target: string; outcome: string }> = [];

      const maxTaskNodes = 100;
      const truncated = rows.length > maxTaskNodes;
      const slicedRows = truncated ? rows.slice(0, maxTaskNodes) : rows;

      for (const row of slicedRows) {
        const agentNodeId = `agent:${row.agent_id}`;
        if (!agentNodes.has(agentNodeId)) {
          agentNodes.set(agentNodeId, {
            id: agentNodeId,
            label: row.agent_name ?? '[Deleted Agent]',
            type: 'agent',
          });
        }
        const taskNodeId = `task:${row.id}`;
        taskNodes.push({ id: taskNodeId, label: row.task_title, type: 'task' });
        edges.push({ source: agentNodeId, target: taskNodeId, outcome: row.outcome });
      }

      const nodes = [...agentNodes.values(), ...taskNodes];
      const result = truncated
        ? { nodes, edges, truncated: true, message: 'Graph limited to 100 task nodes. Use filters to narrow results.' }
        : { nodes, edges };

      return NextResponse.json(result);
    }

    // Standard list format
    const rows = db.prepare(
      `SELECT h.* FROM agent_hub_hive_mind h
       WHERE ${whereClause}
       ORDER BY h.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as HiveMindRow[];

    const total = (db.prepare(
      `SELECT COUNT(*) as cnt FROM agent_hub_hive_mind h WHERE ${whereClause}`
    ).get(...params) as { cnt: number }).cnt;

    const entries = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      agentId: r.agent_id,
      agentRole: r.agent_role,
      actionType: r.action_type,
      taskTitle: r.task_title,
      summary: r.summary,
      outcome: r.outcome,
      filesModified: r.files_modified,
      branch: r.branch,
      runId: r.run_id,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ entries, total, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/agent-hub/hive-mind] GET error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/agent-hub/hive-mind
 * Manually add a hive mind entry (for testing or external use).
 * Body: { agentId, agentRole, taskTitle, summary, outcome, filesModified?, branch?, runId? }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    agentId: string;
    agentRole: string;
    taskTitle: string;
    summary: string;
    outcome: 'success' | 'failed' | 'partial';
    filesModified?: string;
    branch?: string;
    runId?: string;
  };

  if (!body.agentId?.trim()) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  if (!body.agentRole?.trim()) return NextResponse.json({ error: 'agentRole is required' }, { status: 400 });
  if (!body.taskTitle?.trim()) return NextResponse.json({ error: 'taskTitle is required' }, { status: 400 });
  if (!body.summary?.trim()) return NextResponse.json({ error: 'summary is required' }, { status: 400 });
  if (!['success', 'failed', 'partial'].includes(body.outcome)) {
    return NextResponse.json({ error: 'outcome must be success, failed, or partial' }, { status: 400 });
  }

  try {
    const db = getAgentHubDatabase();
    const id = uuidv4();
    db.prepare(
      `INSERT INTO agent_hub_hive_mind
         (id, user_id, agent_id, agent_role, action_type, task_title, summary, outcome, files_modified, branch, run_id)
       VALUES (?, ?, ?, ?, 'task_complete', ?, ?, ?, ?, ?, ?)`
    ).run(
      id, userId, body.agentId, body.agentRole, body.taskTitle, body.summary,
      body.outcome, body.filesModified ?? null, body.branch ?? null, body.runId ?? null
    );

    const entry = getRecentHiveMindEntries(userId, 1).find(e => e.id === id);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[api/agent-hub/hive-mind] POST error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
