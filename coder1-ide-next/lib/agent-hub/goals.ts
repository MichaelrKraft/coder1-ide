import { v4 as uuidv4 } from 'uuid';
import { getAgentHubDatabase } from './db';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  ownerId: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  dueDate?: string;
  taskIds: string[];
  progressPercent: number;
  turn: 'user' | 'claude' | 'done';
  createdAt: string;
  updatedAt: string;
}

export type CreateGoalInput = {
  userId: string;
  title: string;
  description?: string;
  ownerId?: string;
  status?: Goal['status'];
  dueDate?: string;
  taskIds?: string[];
  progressPercent?: number;
};

export type UpdateGoalInput = Partial<
  Omit<Goal, 'id' | 'userId' | 'createdAt'>
>;

interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  owner_id: string;
  status: string;
  due_date: string | null;
  task_ids: string;
  progress_percent: number;
  turn: string;
  created_at: string;
  updated_at: string;
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? '',
    ownerId: row.owner_id,
    status: row.status as Goal['status'],
    dueDate: row.due_date ?? undefined,
    taskIds: JSON.parse(row.task_ids) as string[],
    progressPercent: row.progress_percent,
    turn: (row.turn || 'user') as Goal['turn'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createGoal(input: CreateGoalInput): Goal {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO agent_hub_goals (
      id, user_id, title, description, owner_id, status,
      due_date, task_ids, progress_percent, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

  const row = stmt.get(
    id,
    input.userId,
    input.title,
    input.description ?? null,
    input.ownerId ?? input.userId,
    input.status ?? 'active',
    input.dueDate ?? null,
    JSON.stringify(input.taskIds ?? []),
    input.progressPercent ?? 0,
    now,
    now
  ) as GoalRow;

  return rowToGoal(row);
}

export function getGoal(id: string, userId: string): Goal | null {
  const db = getAgentHubDatabase();

  const row = db
    .prepare('SELECT * FROM agent_hub_goals WHERE id = ? AND user_id = ?')
    .get(id, userId) as GoalRow | undefined;

  return row ? rowToGoal(row) : null;
}

export function listGoals(userId: string): Goal[] {
  const db = getAgentHubDatabase();

  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_goals WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(userId) as GoalRow[];

  return rows.map(rowToGoal);
}

export function updateGoal(
  id: string,
  userId: string,
  updates: UpdateGoalInput
): Goal | null {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();

  const fieldMap: Record<string, string> = {
    title: 'title',
    description: 'description',
    ownerId: 'owner_id',
    status: 'status',
    dueDate: 'due_date',
    taskIds: 'task_ids',
    progressPercent: 'progress_percent',
    turn: 'turn',
  };

  const setClauses: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in updates) {
      setClauses.push(`${dbCol} = ?`);
      const val = updates[jsKey as keyof UpdateGoalInput];
      values.push(jsKey === 'taskIds' && Array.isArray(val) ? JSON.stringify(val) : val);
    }
  }

  values.push(id, userId);

  const row = db
    .prepare(
      `UPDATE agent_hub_goals SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`
    )
    .get(...(values as unknown[])) as GoalRow | undefined;

  return row ? rowToGoal(row) : null;
}

export function deleteGoal(id: string, userId: string): void {
  const db = getAgentHubDatabase();
  db.prepare('DELETE FROM agent_hub_goals WHERE id = ? AND user_id = ?').run(id, userId);
}
