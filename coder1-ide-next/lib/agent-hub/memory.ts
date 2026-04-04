import { v4 as uuidv4 } from 'uuid';
import { getAgentHubDatabase } from './db';

export interface MemoryEntry {
  id: string;
  agentId: string;
  userId: string;
  runId: string | null;
  summary: string;
  createdAt: string;
}

interface MemoryRow {
  id: string;
  agent_id: string;
  user_id: string;
  run_id: string | null;
  summary: string;
  created_at: string;
}

const MAX_MEMORIES_PER_AGENT = 100;

function rowToMemory(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    userId: row.user_id,
    runId: row.run_id,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

/**
 * Check if FTS5 table exists and is usable.
 */
function hasFts(db: ReturnType<typeof getAgentHubDatabase>): boolean {
  try {
    db.prepare('SELECT id FROM agent_hub_memory_fts LIMIT 0').run();
    return true;
  } catch {
    return false;
  }
}

export function storeMemory(
  agentId: string,
  userId: string,
  runId: string | null,
  summary: string
): MemoryEntry {
  const db = getAgentHubDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO agent_hub_memory (id, agent_id, user_id, run_id, summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, agentId, userId, runId, summary, now);

  // Sync to FTS5 if available
  if (hasFts(db)) {
    try {
      db.prepare(
        `INSERT INTO agent_hub_memory_fts (id, summary) VALUES (?, ?)`
      ).run(id, summary);
    } catch {
      // FTS sync failure is non-critical
    }
  }

  // Prune oldest entries if over limit
  const count = db.prepare(
    `SELECT COUNT(*) as cnt FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?`
  ).get(agentId, userId) as { cnt: number };

  if (count.cnt > MAX_MEMORIES_PER_AGENT) {
    const toDelete = db.prepare(
      `SELECT id FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?
       ORDER BY created_at ASC LIMIT ?`
    ).all(agentId, userId, count.cnt - MAX_MEMORIES_PER_AGENT) as { id: string }[];

    for (const row of toDelete) {
      db.prepare(`DELETE FROM agent_hub_memory WHERE id = ?`).run(row.id);
      if (hasFts(db)) {
        try {
          db.prepare(`DELETE FROM agent_hub_memory_fts WHERE id = ?`).run(row.id);
        } catch {
          // FTS cleanup failure is non-critical
        }
      }
    }
  }

  return { id, agentId, userId, runId, summary, createdAt: now };
}

export function recallMemory(
  agentId: string,
  userId: string,
  query: string,
  limit: number = 5
): MemoryEntry[] {
  const db = getAgentHubDatabase();

  if (!query.trim()) {
    // No query -- return most recent
    const rows = db.prepare(
      `SELECT * FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    ).all(agentId, userId, limit) as MemoryRow[];
    return rows.map(rowToMemory);
  }

  // Sanitize query to prevent FTS5 syntax errors
  const safeQuery = query.replace(/['"*(){}[\]^~\\]/g, ' ').trim();
  if (!safeQuery || !hasFts(db)) {
    const rows = db.prepare(
      `SELECT * FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    ).all(agentId, userId, limit) as MemoryRow[];
    return rows.map(rowToMemory);
  }

  // FTS5 search -- match against memory summaries
  try {
    const ftsResults = db.prepare(
      `SELECT id FROM agent_hub_memory_fts WHERE summary MATCH ? ORDER BY rank LIMIT ?`
    ).all(safeQuery, limit * 2) as { id: string }[];

    if (ftsResults.length === 0) {
      const rows = db.prepare(
        `SELECT * FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?
         ORDER BY created_at DESC LIMIT ?`
      ).all(agentId, userId, limit) as MemoryRow[];
      return rows.map(rowToMemory);
    }

    const ids = ftsResults.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT * FROM agent_hub_memory
       WHERE id IN (${placeholders}) AND agent_id = ? AND user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    ).all(...ids, agentId, userId, limit) as MemoryRow[];
    return rows.map(rowToMemory);
  } catch {
    // FTS5 query error -- fall back to recent
    const rows = db.prepare(
      `SELECT * FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    ).all(agentId, userId, limit) as MemoryRow[];
    return rows.map(rowToMemory);
  }
}

export function listMemory(agentId: string, userId: string): MemoryEntry[] {
  const db = getAgentHubDatabase();
  const rows = db.prepare(
    `SELECT * FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?
     ORDER BY created_at DESC`
  ).all(agentId, userId) as MemoryRow[];
  return rows.map(rowToMemory);
}

export function clearMemory(agentId: string, userId: string): void {
  const db = getAgentHubDatabase();
  // Get all IDs for FTS cleanup
  const ids = db.prepare(
    `SELECT id FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?`
  ).all(agentId, userId) as { id: string }[];

  if (hasFts(db)) {
    for (const row of ids) {
      try {
        db.prepare(`DELETE FROM agent_hub_memory_fts WHERE id = ?`).run(row.id);
      } catch {
        // FTS cleanup failure is non-critical
      }
    }
  }

  db.prepare(
    `DELETE FROM agent_hub_memory WHERE agent_id = ? AND user_id = ?`
  ).run(agentId, userId);
}

/**
 * Auto-summarize a completed run. Called after run completion.
 * Uses Haiku for summarization (~$0.001/run), with fallback to basic summary.
 * Gate: only summarize if exitCode=0 OR stdout > 500 chars.
 */
export async function autoSummarize(
  runId: string,
  agentId: string,
  userId: string
): Promise<MemoryEntry | null> {
  const db = getAgentHubDatabase();

  // Fetch run record
  const run = db.prepare(
    `SELECT * FROM agent_hub_runs WHERE id = ? AND user_id = ?`
  ).get(runId, userId) as Record<string, unknown> | undefined;

  if (!run) return null;

  // Fetch stdout chunks
  const chunks = db.prepare(
    `SELECT content FROM agent_hub_run_log_chunks WHERE run_id = ? AND log_type = 'stdout'
     ORDER BY chunk_index ASC`
  ).all(runId) as { content: string }[];

  const fullStdout = chunks.map(c => c.content).join('');

  // Gate: only summarize if exitCode=0 OR stdout > 500 chars
  const exitCode = run.exit_code as number | null;
  if (exitCode !== 0 && fullStdout.length <= 500) return null;

  // Fetch task for context
  const task = db.prepare(
    `SELECT title, description FROM agent_hub_tasks WHERE id = ?`
  ).get(run.task_id as string) as { title: string; description: string } | undefined;

  // Try Haiku summarization
  let summary: string;
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No API key');

    // Truncate stdout for the summarization prompt (max 10KB)
    const truncatedStdout = fullStdout.length > 10000
      ? fullStdout.slice(0, 5000) + '\n...[truncated]...\n' + fullStdout.slice(-5000)
      : fullStdout;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Summarize this agent run in 200 words. Include:
- What task was attempted
- Key decisions made
- Files modified
- Outcome (success/failure)
- Lessons learned

Task: ${task?.title || 'Unknown'}
Description: ${task?.description || 'None'}
Exit code: ${exitCode}
Stdout:
${truncatedStdout}`,
        }],
      }),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    summary = data.content?.[0]?.text || '';
    if (!summary) throw new Error('Empty response');
  } catch {
    // Fallback: basic auto-generated summary
    const first500 = fullStdout.slice(0, 500);
    const last500 = fullStdout.length > 500 ? fullStdout.slice(-500) : '';
    summary = [
      `Task: ${task?.title || 'Unknown'}`,
      `Exit code: ${exitCode}`,
      `Output length: ${fullStdout.length} chars`,
      first500 ? `Start: ${first500}` : '',
      last500 ? `End: ${last500}` : '',
    ].filter(Boolean).join('\n');
  }

  return storeMemory(agentId, userId, runId, summary);
}
