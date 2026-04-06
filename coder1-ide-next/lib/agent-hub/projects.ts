import { v4 as uuidv4 } from 'uuid';
import { getAgentHubDatabase } from './db';

export interface Project {
  id: string;
  userId: string;
  name: string;
  color: string;
  workspacePath: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>;

interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  workspace_path: string;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    workspacePath: row.workspace_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProject(input: CreateProjectInput): Project {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();
  const row = db.prepare(
    `INSERT INTO agent_hub_projects (id, user_id, name, color, workspace_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).get(id, input.userId, input.name, input.color, input.workspacePath, now, now) as ProjectRow;
  return rowToProject(row);
}

export function getProject(id: string, userId: string): Project | null {
  const db = getAgentHubDatabase();
  const row = db.prepare('SELECT * FROM agent_hub_projects WHERE id = ? AND user_id = ?')
    .get(id, userId) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function listProjects(userId: string): Project[] {
  const db = getAgentHubDatabase();
  const rows = db.prepare('SELECT * FROM agent_hub_projects WHERE user_id = ? ORDER BY name ASC')
    .all(userId) as ProjectRow[];
  return rows.map(rowToProject);
}

export function updateProject(id: string, userId: string, input: UpdateProjectInput): Project | null {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();

  const fieldMap: Record<string, string> = {
    name: 'name',
    color: 'color',
    workspacePath: 'workspace_path',
  };

  const setClauses: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in input) {
      setClauses.push(`${dbCol} = ?`);
      values.push(input[jsKey as keyof UpdateProjectInput] ?? null);
    }
  }

  values.push(id, userId);

  const row = db.prepare(
    `UPDATE agent_hub_projects SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`
  ).get(...(values as unknown[])) as ProjectRow | undefined;

  return row ? rowToProject(row) : null;
}

export function deleteProject(id: string, userId: string): boolean {
  const db = getAgentHubDatabase();
  const result = db.prepare('DELETE FROM agent_hub_projects WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}
