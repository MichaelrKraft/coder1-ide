import { v4 as uuidv4 } from 'uuid';
import { getAgentHubDatabase } from './db';

export interface TeachingSession {
  id: string;
  agentId: string;
  userId: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned' | 'converting' | 'converted';
  title: string | null;
  skillName: string | null;
  skillVersion: number;
  chatSnapshot: unknown[];
  generatedSkillMd: string | null;
  messageCount: number;
  startedAt: string;
  pausedAt: string | null;
  completedAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TeachingSessionRow {
  id: string;
  agent_id: string;
  user_id: string;
  status: string;
  title: string | null;
  skill_name: string | null;
  skill_version: number;
  chat_snapshot: string;
  generated_skill_md: string | null;
  message_count: number;
  started_at: string;
  paused_at: string | null;
  completed_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToTeachingSession(row: TeachingSessionRow): TeachingSession {
  return {
    id: row.id,
    agentId: row.agent_id,
    userId: row.user_id,
    status: row.status as TeachingSession['status'],
    title: row.title,
    skillName: row.skill_name,
    skillVersion: row.skill_version,
    chatSnapshot: (() => { try { return JSON.parse(row.chat_snapshot) as unknown[]; } catch { return []; } })(),
    generatedSkillMd: row.generated_skill_md,
    messageCount: row.message_count,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    completedAt: row.completed_at,
    convertedAt: row.converted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTeachingSession(agentId: string, userId: string): TeachingSession {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();

  const row = db.prepare(`
    INSERT INTO agent_hub_teaching_sessions (
      id, agent_id, user_id, status, chat_snapshot,
      skill_version, message_count, started_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'active', '[]', 1, 0, ?, ?, ?)
    RETURNING *
  `).get(id, agentId, userId, now, now, now) as TeachingSessionRow;

  return rowToTeachingSession(row);
}

export function getTeachingSession(id: string, userId: string): TeachingSession | null {
  const db = getAgentHubDatabase();
  const row = db.prepare(
    'SELECT * FROM agent_hub_teaching_sessions WHERE id = ? AND user_id = ?'
  ).get(id, userId) as TeachingSessionRow | undefined;
  return row ? rowToTeachingSession(row) : null;
}

export function getActiveTeachingSession(agentId: string, userId: string): TeachingSession | null {
  const db = getAgentHubDatabase();
  const row = db.prepare(
    `SELECT * FROM agent_hub_teaching_sessions
     WHERE agent_id = ? AND user_id = ? AND status = 'active'
     LIMIT 1`
  ).get(agentId, userId) as TeachingSessionRow | undefined;
  return row ? rowToTeachingSession(row) : null;
}

export function listTeachingSessions(agentId: string, userId: string): TeachingSession[] {
  const db = getAgentHubDatabase();
  const rows = db.prepare(
    `SELECT * FROM agent_hub_teaching_sessions
     WHERE agent_id = ? AND user_id = ?
     ORDER BY created_at DESC`
  ).all(agentId, userId) as TeachingSessionRow[];
  return rows.map(rowToTeachingSession);
}

export type UpdateTeachingSessionInput = Partial<{
  title: string;
  skillName: string;
  skillVersion: number;
  generatedSkillMd: string;
  messageCount: number;
  status: TeachingSession['status'];
  pausedAt: string | null;
  completedAt: string | null;
  convertedAt: string | null;
}>;

export function updateTeachingSession(
  id: string,
  userId: string,
  input: UpdateTeachingSessionInput
): TeachingSession | null {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();

  const fieldMap: Record<string, string> = {
    title: 'title',
    skillName: 'skill_name',
    skillVersion: 'skill_version',
    generatedSkillMd: 'generated_skill_md',
    messageCount: 'message_count',
    status: 'status',
    pausedAt: 'paused_at',
    completedAt: 'completed_at',
    convertedAt: 'converted_at',
  };

  const setClauses: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in input) {
      setClauses.push(`${dbCol} = ?`);
      values.push(input[jsKey as keyof UpdateTeachingSessionInput] ?? null);
    }
  }

  values.push(id, userId);

  const row = db.prepare(
    `UPDATE agent_hub_teaching_sessions SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`
  ).get(...(values as Parameters<typeof db.prepare>)) as TeachingSessionRow | undefined;

  return row ? rowToTeachingSession(row) : null;
}

export function completeTeachingSession(id: string, userId: string): TeachingSession | null {
  const now = new Date().toISOString();
  return updateTeachingSession(id, userId, { status: 'completed', completedAt: now });
}

export function abandonTeachingSession(id: string, userId: string): TeachingSession | null {
  return updateTeachingSession(id, userId, { status: 'abandoned' });
}

export function getTeachingSessionMessages(sessionId: string, userId: string): unknown[] {
  const db = getAgentHubDatabase();
  return db.prepare(
    `SELECT id, agent_id, role, content, created_at
     FROM agent_hub_chat_messages
     WHERE teaching_session_id = ? AND user_id = ?
     ORDER BY created_at ASC`
  ).all(sessionId, userId);
}

export function snapshotChat(id: string, userId: string): number {
  const db = getAgentHubDatabase();
  const txn = db.transaction(() => {
    const messages = getTeachingSessionMessages(id, userId);
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE agent_hub_teaching_sessions
       SET chat_snapshot = ?, message_count = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).run(JSON.stringify(messages), messages.length, now, id, userId);
    return messages.length;
  });
  return txn();
}
