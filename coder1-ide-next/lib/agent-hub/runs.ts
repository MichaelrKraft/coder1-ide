import { v4 as uuidv4 } from 'uuid';
import { getAgentHubDatabase } from './db';

export interface Run {
  id: string;
  agentId: string;
  taskId: string;
  userId: string;
  sessionId: string | null;
  status: 'running' | 'awaiting_approval' | 'approved' | 'rejected' | 'failed' | 'cancelled' | 'needs_human_input';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costCents: number;
  exitCode: number | null;
  gitDiff: string | null;
  approvalStatus: string | null;
  approvedBy: string | null;
  errorSummary: string | null;
  humanInputRequest: string | null;
  humanInputResponse: string | null;
  startedAt: string;
  completedAt: string | null;
  worktreePath: string | null;
}

export type CreateRunInput = Pick<Run, 'agentId' | 'taskId' | 'userId' | 'model'>;
export type UpdateRunInput = Partial<Omit<Run, 'id' | 'userId' | 'agentId' | 'taskId' | 'startedAt'>>;

interface RunRow {
  id: string;
  agent_id: string;
  task_id: string;
  user_id: string;
  session_id: string | null;
  status: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cost_cents: number;
  exit_code: number | null;
  git_diff: string | null;
  approval_status: string | null;
  approved_by: string | null;
  error_summary: string | null;
  human_input_request: string | null;
  human_input_response: string | null;
  started_at: string;
  completed_at: string | null;
  worktree_path: string | null;
}

function rowToRun(row: RunRow): Run {
  return {
    id: row.id,
    agentId: row.agent_id,
    taskId: row.task_id,
    userId: row.user_id,
    sessionId: row.session_id,
    status: row.status as Run['status'],
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    cacheReadTokens: row.cache_read_tokens,
    costCents: row.cost_cents,
    exitCode: row.exit_code,
    gitDiff: row.git_diff,
    approvalStatus: row.approval_status,
    approvedBy: row.approved_by,
    errorSummary: row.error_summary,
    humanInputRequest: row.human_input_request,
    humanInputResponse: row.human_input_response,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    worktreePath: row.worktree_path,
  };
}

export function createRun(input: CreateRunInput): Run {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();

  const row = db
    .prepare(
      `INSERT INTO agent_hub_runs (
        id, agent_id, task_id, user_id, session_id, status, model,
        input_tokens, output_tokens, cache_read_tokens, cost_cents,
        exit_code, git_diff, approval_status, approved_by, error_summary,
        started_at, completed_at, worktree_path
      ) VALUES (?, ?, ?, ?, NULL, 'running', ?, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, ?, NULL, NULL)
      RETURNING *`
    )
    .get(id, input.agentId, input.taskId, input.userId, input.model, now) as RunRow;

  return rowToRun(row);
}

export function getRun(id: string, userId: string): Run | null {
  const db = getAgentHubDatabase();
  const row = db
    .prepare('SELECT * FROM agent_hub_runs WHERE id = ?')
    .get(id) as RunRow | undefined;
  // userId check relaxed intentionally — server.js handlers may use 'default'
  if (!row) return null;
  if (row.user_id !== userId && userId !== 'default') return null;
  return rowToRun(row);
}

export function updateRun(id: string, userId: string, input: UpdateRunInput): Run | null {
  const db = getAgentHubDatabase();

  const fieldMap: Record<string, string> = {
    sessionId: 'session_id',
    status: 'status',
    inputTokens: 'input_tokens',
    outputTokens: 'output_tokens',
    cacheReadTokens: 'cache_read_tokens',
    costCents: 'cost_cents',
    exitCode: 'exit_code',
    gitDiff: 'git_diff',
    approvalStatus: 'approval_status',
    approvedBy: 'approved_by',
    errorSummary: 'error_summary',
    completedAt: 'completed_at',
    worktreePath: 'worktree_path',
    humanInputRequest: 'human_input_request',
    humanInputResponse: 'human_input_response',
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in input) {
      setClauses.push(`${dbCol} = ?`);
      values.push(input[jsKey as keyof UpdateRunInput] ?? null);
    }
  }

  if (setClauses.length === 0) return getRun(id, userId);

  values.push(id);
  values.push(userId);

  const row = db
    .prepare(
      `UPDATE agent_hub_runs SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`
    )
    .get(...(values as Parameters<typeof db.prepare>)) as RunRow | undefined;

  return row ? rowToRun(row) : null;
}

export function appendRunLogChunk(
  runId: string,
  content: string,
  type: 'stdout' | 'stderr'
): void {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();

  // Redact internal token from log content
  const internalToken = process.env.AGENT_HUB_INTERNAL_TOKEN;
  const safeContent = internalToken
    ? content.replaceAll(internalToken, '[REDACTED]')
    : content;

  // Get next chunk index
  const countRow = db
    .prepare('SELECT COUNT(*) as cnt FROM agent_hub_run_log_chunks WHERE run_id = ?')
    .get(runId) as { cnt: number };

  db.prepare(
    `INSERT INTO agent_hub_run_log_chunks (id, run_id, chunk_index, content, log_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, runId, countRow.cnt, safeContent, type, now);
}

export function listRunsForTask(taskId: string, userId: string): Run[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_runs WHERE task_id = ? AND user_id = ? ORDER BY started_at DESC'
    )
    .all(taskId, userId) as RunRow[];
  return rows.map(rowToRun);
}

export function listRunsForAgent(agentId: string, userId: string): Run[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_runs WHERE agent_id = ? AND user_id = ? ORDER BY started_at DESC'
    )
    .all(agentId, userId) as RunRow[];
  return rows.map(rowToRun);
}

export function listRuns(userId: string): Run[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare('SELECT * FROM agent_hub_runs WHERE user_id = ? ORDER BY started_at DESC')
    .all(userId) as RunRow[];
  return rows.map(rowToRun);
}

export interface RunLogChunk {
  id: string;
  runId: string;
  chunkIndex: number;
  content: string;
  logType: 'stdout' | 'stderr';
  createdAt: string;
}

interface RunLogChunkRow {
  id: string;
  run_id: string;
  chunk_index: number;
  content: string;
  log_type: string;
  created_at: string;
}

export function getRunLogChunks(runId: string): RunLogChunk[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_run_log_chunks WHERE run_id = ? ORDER BY chunk_index ASC'
    )
    .all(runId) as RunLogChunkRow[];
  return rows.map((row) => ({
    id: row.id,
    runId: row.run_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    logType: row.log_type as 'stdout' | 'stderr',
    createdAt: row.created_at,
  }));
}

export interface RunThought {
  id: string;
  runId: string;
  sequence: number;
  eventType: 'tool_call' | 'tool_result' | 'thinking';
  label: string;
  tool: string | null;
  detail: string | null;
  createdAt: string;
}

interface RunThoughtRow {
  id: string;
  run_id: string;
  sequence: number;
  event_type: string;
  label: string;
  tool: string | null;
  detail: string | null;
  created_at: string;
}

export function appendRunThought(
  runId: string,
  eventType: RunThought['eventType'],
  label: string,
  tool?: string,
  detail?: string,
): void {
  const db = getAgentHubDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const countRow = db
    .prepare('SELECT COUNT(*) as cnt FROM agent_hub_run_thoughts WHERE run_id = ?')
    .get(runId) as { cnt: number };

  db.prepare(
    `INSERT INTO agent_hub_run_thoughts (id, run_id, sequence, event_type, label, tool, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, runId, countRow.cnt, eventType, label, tool ?? null, detail ?? null, now);
}

export function getRunThoughts(runId: string): RunThought[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_run_thoughts WHERE run_id = ? ORDER BY sequence ASC'
    )
    .all(runId) as RunThoughtRow[];
  return rows.map((row) => ({
    id: row.id,
    runId: row.run_id,
    sequence: row.sequence,
    eventType: row.event_type as RunThought['eventType'],
    label: row.label,
    tool: row.tool,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}

/**
 * Returns the human input response from the most recent run for a task
 * that had needs_human_input status (stored in humanInputResponse).
 * Used to inject context into the next run when a task was previously escalated.
 */
export function getLastHumanInputResponse(taskId: string, userId: string): string | null {
  const db = getAgentHubDatabase();
  const row = db
    .prepare(
      `SELECT human_input_response FROM agent_hub_runs
       WHERE task_id = ? AND user_id = ? AND human_input_response IS NOT NULL
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(taskId, userId) as { human_input_response: string | null } | undefined;
  return row?.human_input_response ?? null;
}
