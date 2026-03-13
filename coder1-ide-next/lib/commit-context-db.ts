import { getDatabase } from '@/lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface CommitContextRow {
  id: string;
  commit_sha: string;
  parent_sha: string | null;
  branch: string;
  commit_message: string | null;
  commit_author: string | null;
  commit_timestamp: string | null;
  repo_path: string | null;
  session_id: string | null;
  checkpoint_id: string | null;
  session_summary: string | null;
  summary_status: 'pending' | 'generating' | 'done' | 'failed' | 'no_session';
  files_changed: string | null;
  created_at: string;
}

export interface InsertCommitContextParams {
  id: string;
  commit_sha: string;
  parent_sha?: string | null;
  branch: string;
  commit_message?: string | null;
  commit_author?: string | null;
  commit_timestamp?: string | null;
  repo_path?: string | null;
  session_id?: string | null;
  checkpoint_id?: string | null;
  summary_status: 'pending' | 'no_session';
  files_changed?: string | null;
}

/**
 * Runs the commit_contexts migration and returns the open DB handle.
 * Safe to call multiple times (CREATE TABLE IF NOT EXISTS).
 */
export async function initCommitContextTable() {
  const db = await getDatabase();
  const migration = readFileSync(
    join(process.cwd(), 'db', 'migrations', '004_commit_contexts.sql'),
    'utf-8'
  );
  db.exec(migration);
  return db;
}

export async function insertCommitContext(
  db: any,
  params: InsertCommitContextParams
): Promise<void> {
  db.prepare(`
    INSERT OR IGNORE INTO commit_contexts
      (id, commit_sha, parent_sha, branch, commit_message, commit_author,
       commit_timestamp, repo_path, session_id, checkpoint_id, summary_status, files_changed)
    VALUES
      (@id, @commit_sha, @parent_sha, @branch, @commit_message, @commit_author,
       @commit_timestamp, @repo_path, @session_id, @checkpoint_id, @summary_status, @files_changed)
  `).run({
    id: params.id,
    commit_sha: params.commit_sha,
    parent_sha: params.parent_sha ?? null,
    branch: params.branch,
    commit_message: params.commit_message ?? null,
    commit_author: params.commit_author ?? null,
    commit_timestamp: params.commit_timestamp ?? null,
    repo_path: params.repo_path ?? null,
    session_id: params.session_id ?? null,
    checkpoint_id: params.checkpoint_id ?? null,
    summary_status: params.summary_status,
    files_changed: params.files_changed ?? null,
  });
}

export async function getCommitContext(
  db: any,
  sha: string
): Promise<CommitContextRow | null> {
  const row = db.prepare(
    'SELECT * FROM commit_contexts WHERE commit_sha = ?'
  ).get(sha) as CommitContextRow | undefined;
  return row ?? null;
}

export async function listCommitContexts(
  db: any,
  opts: { limit?: number; branch?: string } = {}
): Promise<CommitContextRow[]> {
  const limit = opts.limit ?? 100;
  if (opts.branch) {
    return db.prepare(
      'SELECT * FROM commit_contexts WHERE branch = ? ORDER BY created_at DESC LIMIT ?'
    ).all(opts.branch, limit) as CommitContextRow[];
  }
  return db.prepare(
    'SELECT * FROM commit_contexts ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as CommitContextRow[];
}

export async function updateSummaryStatus(
  db: any,
  sha: string,
  status: CommitContextRow['summary_status'],
  summary?: string | null
): Promise<void> {
  if (summary !== undefined) {
    db.prepare(
      'UPDATE commit_contexts SET summary_status = ?, session_summary = ? WHERE commit_sha = ?'
    ).run(status, summary ?? null, sha);
  } else {
    db.prepare(
      'UPDATE commit_contexts SET summary_status = ? WHERE commit_sha = ?'
    ).run(status, sha);
  }
}

export async function updateFilesChanged(
  db: any,
  sha: string,
  filesChanged: string
): Promise<void> {
  db.prepare(
    'UPDATE commit_contexts SET files_changed = ? WHERE commit_sha = ?'
  ).run(filesChanged, sha);
}

export async function getPendingCommits(db: any): Promise<CommitContextRow[]> {
  return db.prepare(
    "SELECT * FROM commit_contexts WHERE summary_status IN ('pending', 'generating') ORDER BY created_at ASC"
  ).all() as CommitContextRow[];
}

export async function deleteCommitContext(db: any, sha: string): Promise<void> {
  db.prepare('DELETE FROM commit_contexts WHERE commit_sha = ?').run(sha);
}

/** Returns only the sha + summary_status columns — used for badge overlay */
export async function listCommitShas(
  db: any,
  limit = 200
): Promise<Pick<CommitContextRow, 'commit_sha' | 'summary_status'>[]> {
  return db.prepare(
    'SELECT commit_sha, summary_status FROM commit_contexts ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as Pick<CommitContextRow, 'commit_sha' | 'summary_status'>[];
}
