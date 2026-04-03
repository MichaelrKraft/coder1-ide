import { v4 as uuidv4 } from 'uuid';
import { getAgentHubDatabase } from './db';

export interface Task {
  id: string;
  userId: string;
  agentId: string;
  parentTaskId: string | null;
  title: string;
  description: string;
  githubIssueUrl: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  estimatedCostCents: number | null;
  actualCostCents: number;
  runIds: string[];
  modifiedFiles: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export type CreateTaskInput = Pick<Task, 'userId' | 'agentId' | 'title'> &
  Partial<Pick<Task, 'description' | 'githubIssueUrl' | 'priority' | 'parentTaskId'>>;

export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>;

interface TaskRow {
  id: string;
  user_id: string;
  agent_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  github_issue_url: string | null;
  priority: string;
  status: string;
  estimated_cost_cents: number | null;
  actual_cost_cents: number;
  run_ids: string;
  modified_files: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    agentId: row.agent_id,
    parentTaskId: row.parent_task_id,
    title: row.title,
    description: row.description ?? '',
    githubIssueUrl: row.github_issue_url,
    priority: row.priority as Task['priority'],
    status: row.status as Task['status'],
    estimatedCostCents: row.estimated_cost_cents,
    actualCostCents: row.actual_cost_cents,
    runIds: JSON.parse(row.run_ids) as string[],
    modifiedFiles: JSON.parse(row.modified_files) as string[],
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export function createTask(input: CreateTaskInput): Task {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();

  const row = db
    .prepare(
      `INSERT INTO agent_hub_tasks (
        id, user_id, agent_id, parent_task_id, title, description,
        github_issue_url, priority, status, estimated_cost_cents,
        actual_cost_cents, run_ids, modified_files, created_at, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'backlog', NULL, 0, '[]', '[]', ?, NULL, NULL)
      RETURNING *`
    )
    .get(
      id,
      input.userId,
      input.agentId,
      input.parentTaskId ?? null,
      input.title,
      input.description ?? null,
      input.githubIssueUrl ?? null,
      input.priority ?? 'medium',
      now
    ) as TaskRow;

  return rowToTask(row);
}

export function getTask(id: string, userId: string): Task | null {
  const db = getAgentHubDatabase();
  const row = db
    .prepare('SELECT * FROM agent_hub_tasks WHERE id = ? AND user_id = ?')
    .get(id, userId) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function listTasks(userId: string): Task[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare('SELECT * FROM agent_hub_tasks WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as TaskRow[];
  return rows.map(rowToTask);
}

export function listTasksByAgent(agentId: string, userId: string): Task[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_tasks WHERE agent_id = ? AND user_id = ? ORDER BY created_at DESC'
    )
    .all(agentId, userId) as TaskRow[];
  return rows.map(rowToTask);
}

export function updateTask(id: string, userId: string, input: UpdateTaskInput): Task | null {
  const db = getAgentHubDatabase();

  const fieldMap: Record<string, string> = {
    agentId: 'agent_id',
    parentTaskId: 'parent_task_id',
    title: 'title',
    description: 'description',
    githubIssueUrl: 'github_issue_url',
    priority: 'priority',
    status: 'status',
    estimatedCostCents: 'estimated_cost_cents',
    actualCostCents: 'actual_cost_cents',
    runIds: 'run_ids',
    modifiedFiles: 'modified_files',
    startedAt: 'started_at',
    completedAt: 'completed_at',
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in input) {
      setClauses.push(`${dbCol} = ?`);
      const val = input[jsKey as keyof UpdateTaskInput];
      if ((jsKey === 'runIds' || jsKey === 'modifiedFiles') && Array.isArray(val)) {
        values.push(JSON.stringify(val));
      } else {
        values.push(val ?? null);
      }
    }
  }

  if (setClauses.length === 0) return getTask(id, userId);

  values.push(id, userId);

  const row = db
    .prepare(
      `UPDATE agent_hub_tasks SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`
    )
    .get(...(values as Parameters<typeof db.prepare>)) as TaskRow | undefined;

  return row ? rowToTask(row) : null;
}

export function cancelTask(id: string, userId: string): boolean {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE agent_hub_tasks SET status = 'cancelled', completed_at = ? WHERE id = ? AND user_id = ?`
    )
    .run(now, id, userId);
  return result.changes > 0;
}
