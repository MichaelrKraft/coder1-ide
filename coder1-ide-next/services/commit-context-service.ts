/**
 * CommitContextService
 *
 * Captures AI session context at git commit time.
 * Replaces the Time Capsule system.
 *
 * Usage (server.js):
 *   const { commitContextService } = require('./services/commit-context-service');
 *   commitContextService.capture({ sha, branch, message, sessionId, checkpointId, repoPath });
 */

import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  initCommitContextTable,
  insertCommitContext,
  getCommitContext,
  listCommitContexts,
  updateSummaryStatus,
  updateFilesChanged,
  getPendingCommits,
  deleteCommitContext,
  listCommitShas,
  type CommitContextRow,
} from '@/lib/commit-context-db';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface CaptureParams {
  sha: string;
  branch: string;
  message: string;
  sessionId: string | null;
  checkpointId: string | null;
  repoPath: string | null;
}

// ============================================================================
// In-memory summary queue (max 2 concurrent)
// ============================================================================

interface QueueItem {
  sha: string;
  sessionId: string | null;
  repoPath: string | null;
  retryCount: number;
}

const MAX_CONCURRENT = 2;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

class SummaryQueue {
  private queue: QueueItem[] = [];
  private running = 0;

  enqueue(item: QueueItem): void {
    this.queue.push(item);
    this.drain();
  }

  private drain(): void {
    while (this.running < MAX_CONCURRENT && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;
      this.process(item).finally(() => {
        this.running--;
        this.drain();
      });
    }
  }

  private async process(item: QueueItem): Promise<void> {
    const { sha, sessionId, repoPath, retryCount } = item;
    let db: any = null;
    try {
      db = await initCommitContextTable();
      await updateSummaryStatus(db, sha, 'generating');

      // Fetch git diff for files changed
      if (repoPath) {
        try {
          const filesChanged = await fetchGitFilesDiff(repoPath, sha);
          if (filesChanged) await updateFilesChanged(db, sha, filesChanged);
        } catch {
          // Non-fatal — continue to summary
        }
      }

      const summary = await generateAISummary({ sha, sessionId, db });
      await updateSummaryStatus(db, sha, 'done', summary);

      emitContextReady(sha);
      console.log(`[CommitContext] Summary generated for ${sha.slice(0, 7)}`);
    } catch (err) {
      console.error(`[CommitContext] Summary failed for ${sha.slice(0, 7)}:`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`[CommitContext] Retrying ${sha.slice(0, 7)} in ${delay}ms (attempt ${retryCount + 1})`);
        setTimeout(() => {
          this.enqueue({ sha, sessionId, repoPath, retryCount: retryCount + 1 });
        }, delay);
      } else {
        if (db) {
          try { await updateSummaryStatus(db, sha, 'failed'); } catch { /* ignore */ }
        }
        console.error(`[CommitContext] Giving up on ${sha.slice(0, 7)} after ${MAX_RETRIES} retries`);
      }
    } finally {
      if (db) {
        try { db.close(); } catch { /* ignore */ }
      }
    }
  }
}

const summaryQueue = new SummaryQueue();

// ============================================================================
// Socket.IO integration (optional — set by server.js after init)
// ============================================================================

let _io: any = null;

export function setSocketIO(io: any): void {
  _io = io;
}

function emitContextReady(sha: string): void {
  if (_io) {
    try {
      _io.emit('commit:context_ready', { sha });
    } catch {
      /* ignore */
    }
  }
}

// ============================================================================
// Git helpers
// ============================================================================

async function fetchGitFilesDiff(repoPath: string, sha: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `git diff-tree --no-commit-id -r --name-status ${sha}`,
      { cwd: repoPath, timeout: 5000 }
    );
    const files = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [status, ...rest] = line.split('\t');
        return { path: rest.join('\t'), status };
      });
    return JSON.stringify(files);
  } catch {
    return null;
  }
}

// ============================================================================
// AI summary generation
// ============================================================================

async function generateAISummary({
  sha,
  sessionId,
  db,
}: {
  sha: string;
  sessionId: string | null;
  db: any;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const row = await getCommitContext(db, sha);
  if (!row) throw new Error(`No row for sha ${sha}`);

  let terminalContext = '';
  if (sessionId) {
    try {
      const checkpoint = db.prepare(
        'SELECT terminal_history FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(sessionId) as { terminal_history?: string } | undefined;
      if (checkpoint?.terminal_history) {
        const history = checkpoint.terminal_history;
        terminalContext = history.length > 3000
          ? '...' + history.slice(-3000)
          : history;
      }
    } catch {
      // No checkpoint — proceed without terminal context
    }
  }

  const filesContext = row.files_changed
    ? (() => {
        try {
          const files = JSON.parse(row.files_changed) as { path: string; status: string }[];
          return files.map(f => `  ${f.status}  ${f.path}`).join('\n');
        } catch {
          return row.files_changed;
        }
      })()
    : 'Not available';

  const prompt = `You are summarizing what an AI coding assistant was working on when a git commit was made.

Commit: ${sha.slice(0, 7)}
Branch: ${row.branch}
Message: ${row.commit_message || 'No message'}
Files changed:
${filesContext}
${terminalContext ? `\nRecent terminal activity:\n${terminalContext}` : ''}

Write a 2-4 sentence summary of what was being built or fixed in this commit. Focus on the intent and reasoning, not just the file names. Be specific and concrete.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json() as { content: { text: string }[] };
  return data.content[0]?.text?.trim() ?? '';
}

// ============================================================================
// CommitContextService (singleton)
// ============================================================================

export class CommitContextService {
  private static instance: CommitContextService;

  static getInstance(): CommitContextService {
    if (!CommitContextService.instance) {
      CommitContextService.instance = new CommitContextService();
    }
    return CommitContextService.instance;
  }

  private generateId(): string {
    return `cc_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Called immediately when detectGitEvent() fires.
   * Inserts DB row in ~5ms, dispatches async work if sessionId present.
   */
  async capture(params: CaptureParams): Promise<void> {
    const { sha, branch, message, sessionId, checkpointId, repoPath } = params;

    let db: any = null;
    try {
      db = await initCommitContextTable();
      await insertCommitContext(db, {
        id: this.generateId(),
        commit_sha: sha,
        branch,
        commit_message: message,
        session_id: sessionId,
        checkpoint_id: checkpointId,
        repo_path: repoPath,
        summary_status: sessionId ? 'pending' : 'no_session',
      });
    } finally {
      if (db) {
        try { db.close(); } catch { /* ignore */ }
      }
    }

    if (sessionId) {
      summaryQueue.enqueue({ sha, sessionId, repoPath, retryCount: 0 });
    }
  }

  async getForSha(sha: string): Promise<CommitContextRow | null> {
    const db = await initCommitContextTable();
    try {
      return await getCommitContext(db, sha);
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async listByBranch(branch: string, limit = 50): Promise<CommitContextRow[]> {
    const db = await initCommitContextTable();
    try {
      return await listCommitContexts(db, { branch, limit });
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async listAll(limit = 200): Promise<CommitContextRow[]> {
    const db = await initCommitContextTable();
    try {
      return await listCommitContexts(db, { limit });
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async listShas(limit = 200): Promise<Pick<CommitContextRow, 'commit_sha' | 'summary_status'>[]> {
    const db = await initCommitContextTable();
    try {
      return await listCommitShas(db, limit);
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async deleteContext(sha: string): Promise<void> {
    const db = await initCommitContextTable();
    try {
      await deleteCommitContext(db, sha);
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async retrySummary(sha: string): Promise<void> {
    const db = await initCommitContextTable();
    try {
      const row = await getCommitContext(db, sha);
      if (!row) throw new Error(`No commit context found for sha: ${sha}`);
      await updateSummaryStatus(db, sha, 'pending');
      summaryQueue.enqueue({ sha, sessionId: row.session_id, repoPath: row.repo_path, retryCount: 0 });
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  /**
   * On server startup: re-queue any rows stuck in pending/generating state.
   */
  async requeue(): Promise<void> {
    const db = await initCommitContextTable();
    let pending: CommitContextRow[] = [];
    try {
      pending = await getPendingCommits(db);
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }

    if (pending.length > 0) {
      console.log(`[CommitContext] Requeueing ${pending.length} pending commits on startup`);
      for (const row of pending) {
        if (row.session_id) {
          summaryQueue.enqueue({
            sha: row.commit_sha,
            sessionId: row.session_id,
            repoPath: row.repo_path,
            retryCount: 0,
          });
        }
      }
    }
  }
}

export const commitContextService = CommitContextService.getInstance();
