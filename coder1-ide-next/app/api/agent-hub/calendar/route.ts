import { NextRequest, NextResponse } from 'next/server';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const month = request.nextUrl.searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month query param required (YYYY-MM)' }, { status: 400 });
  }

  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const endDate = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, '0')}-01`;

  try {
    const db = getAgentHubDatabase();

    const tasksCreated = db.prepare(`
      SELECT date(created_at) as date, title, id, 'task_created' as type
      FROM agent_hub_tasks
      WHERE user_id = ? AND date(created_at) >= ? AND date(created_at) < ?
    `).all(userId, startDate, endDate);

    const runs = db.prepare(`
      SELECT date(r.started_at) as date, t.title, r.status, r.id,
        CASE WHEN r.status IN ('approved','completed') THEN 'run_succeeded'
             WHEN r.status = 'failed' THEN 'run_failed'
             ELSE 'run_other' END as type,
        a.name as agent_name
      FROM agent_hub_runs r
      LEFT JOIN agent_hub_tasks t ON r.task_id = t.id
      LEFT JOIN agent_hub_agents a ON r.agent_id = a.id
      WHERE r.user_id = ? AND date(r.started_at) >= ? AND date(r.started_at) < ?
    `).all(userId, startDate, endDate);

    const scheduled = db.prepare(`
      SELECT date(next_run_at) as date, title, id, 'scheduled' as type
      FROM agent_hub_tasks
      WHERE user_id = ? AND schedule_enabled = 1 AND date(next_run_at) >= ? AND date(next_run_at) < ?
    `).all(userId, startDate, endDate);

    const events = [...tasksCreated, ...runs, ...scheduled].sort((a: any, b: any) =>
      (a.date as string).localeCompare(b.date as string)
    );

    return NextResponse.json({ events });
  } catch (err) {
    console.error('[calendar] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
