import { v4 as uuidv4 } from 'uuid';
import { getAgentHubDatabase } from './db';

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface CommentRow {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function createComment(taskId: string, userId: string, content: string): Comment {
  const db = getAgentHubDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();
  const row = db.prepare(
    `INSERT INTO agent_hub_comments (id, task_id, user_id, content, created_at)
     VALUES (?, ?, ?, ?, ?) RETURNING *`
  ).get(id, taskId, userId, content, now) as CommentRow;
  return rowToComment(row);
}

export function listComments(taskId: string): Comment[] {
  const db = getAgentHubDatabase();
  const rows = db.prepare('SELECT * FROM agent_hub_comments WHERE task_id = ? ORDER BY created_at ASC')
    .all(taskId) as CommentRow[];
  return rows.map(rowToComment);
}

export function deleteComment(id: string, userId: string): boolean {
  const db = getAgentHubDatabase();
  const result = db.prepare('DELETE FROM agent_hub_comments WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}
