import { v4 as uuidv4 } from 'uuid';
import { getAgentHubDatabase } from './db';

export interface Agent {
  id: string;
  userId: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  skills: string[];
  workspacePath: string;
  model: 'claude-haiku-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-6';
  monthlyBudgetCents: number;
  maxConcurrentRuns: number;
  status: 'idle' | 'running' | 'error' | 'archived';
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  supervisorAgentId: string | null;
}

export type CreateAgentInput = Omit<
  Agent,
  'id' | 'status' | 'lastRunAt' | 'createdAt' | 'updatedAt'
>;

export type UpdateAgentInput = Partial<
  Omit<Agent, 'id' | 'userId' | 'createdAt'>
>;

// DB row shape — skills stored as JSON string
interface AgentRow {
  id: string;
  user_id: string;
  name: string;
  role: string;
  description: string | null;
  system_prompt: string;
  skills: string;
  workspace_path: string;
  model: string;
  monthly_budget_cents: number;
  max_concurrent_runs: number;
  status: string;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  supervisor_agent_id: string | null;
}

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    role: row.role,
    description: row.description ?? '',
    systemPrompt: row.system_prompt,
    skills: JSON.parse(row.skills) as string[],
    workspacePath: row.workspace_path,
    model: row.model as Agent['model'],
    monthlyBudgetCents: row.monthly_budget_cents,
    maxConcurrentRuns: row.max_concurrent_runs,
    status: row.status as Agent['status'],
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    supervisorAgentId: row.supervisor_agent_id,
  };
}

export function createAgent(input: CreateAgentInput): Agent {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO agent_hub_agents (
      id, user_id, name, role, description, system_prompt, skills,
      workspace_path, model, monthly_budget_cents, max_concurrent_runs,
      status, last_run_at, created_at, updated_at, supervisor_agent_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', NULL, ?, ?, ?)
    RETURNING *
  `);

  const row = stmt.get(
    id,
    input.userId,
    input.name,
    input.role,
    input.description ?? null,
    input.systemPrompt,
    JSON.stringify(input.skills),
    input.workspacePath,
    input.model,
    input.monthlyBudgetCents,
    input.maxConcurrentRuns,
    now,
    now,
    input.supervisorAgentId ?? null
  ) as AgentRow;

  return rowToAgent(row);
}

export function getAgent(id: string, userId: string): Agent | null {
  const db = getAgentHubDatabase();

  const row = db
    .prepare('SELECT * FROM agent_hub_agents WHERE id = ? AND user_id = ?')
    .get(id, userId) as AgentRow | undefined;

  return row ? rowToAgent(row) : null;
}

export function listAgents(userId: string): Agent[] {
  const db = getAgentHubDatabase();

  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_agents WHERE user_id = ? ORDER BY last_run_at DESC, created_at DESC'
    )
    .all(userId) as AgentRow[];

  return rows.map(rowToAgent);
}

export function updateAgent(
  id: string,
  userId: string,
  input: UpdateAgentInput
): Agent | null {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();

  // Build SET clause dynamically from provided fields
  const fieldMap: Record<string, string> = {
    name: 'name',
    role: 'role',
    description: 'description',
    systemPrompt: 'system_prompt',
    skills: 'skills',
    workspacePath: 'workspace_path',
    model: 'model',
    monthlyBudgetCents: 'monthly_budget_cents',
    maxConcurrentRuns: 'max_concurrent_runs',
    status: 'status',
    lastRunAt: 'last_run_at',
    supervisorAgentId: 'supervisor_agent_id',
  };

  const setClauses: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in input) {
      setClauses.push(`${dbCol} = ?`);
      const val = input[jsKey as keyof UpdateAgentInput];
      values.push(jsKey === 'skills' && Array.isArray(val) ? JSON.stringify(val) : val);
    }
  }

  values.push(id, userId);

  const row = db
    .prepare(
      `UPDATE agent_hub_agents SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`
    )
    .get(...(values as Parameters<typeof db.prepare>)) as AgentRow | undefined;

  return row ? rowToAgent(row) : null;
}

export function archiveAgent(id: string, userId: string): boolean {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE agent_hub_agents SET status = 'archived', updated_at = ? WHERE id = ? AND user_id = ?`
    )
    .run(now, id, userId);

  return result.changes > 0;
}

export function listSubordinates(supervisorId: string, userId: string): Agent[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_agents WHERE supervisor_agent_id = ? AND user_id = ? AND status != ? ORDER BY name ASC'
    )
    .all(supervisorId, userId, 'archived') as AgentRow[];
  return rows.map(rowToAgent);
}

export function isSupervisorCyclic(agentId: string, proposedSupervisorId: string, userId: string): boolean {
  const db = getAgentHubDatabase();
  let currentId: string | null = proposedSupervisorId;
  let hops = 0;
  const MAX_HOPS = 20;

  while (currentId && hops < MAX_HOPS) {
    if (currentId === agentId) return true;
    const row = db
      .prepare('SELECT supervisor_agent_id FROM agent_hub_agents WHERE id = ? AND user_id = ?')
      .get(currentId, userId) as { supervisor_agent_id: string | null } | undefined;
    currentId = row?.supervisor_agent_id ?? null;
    hops++;
  }
  return false;
}
