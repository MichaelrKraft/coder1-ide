/**
 * Time Capsule Database Operations
 *
 * CRUD operations for Time Capsules stored in context-memory.db.
 * Follows the same patterns as lib/database.ts and lib/auth/db.ts.
 */

import { getDatabase, closeDatabaseSafely } from './database';

export interface TimeCapsule {
  id: string;
  user_id: string | null;
  team_id: string | null;
  repository_path: string;
  commit_sha: string;
  commit_message: string | null;
  commit_branch: string | null;
  agent_name: string;
  agent_version: string | null;
  session_start_time: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  files_read: string | null;
  files_written: string | null;
  capsule_git_path: string | null;
  trigger_type: string;
  created_at: string;
}

export interface CreateTimeCapsuleInput {
  user_id?: string;
  team_id?: string;
  repository_path: string;
  commit_sha: string;
  commit_message?: string;
  commit_branch?: string;
  agent_name?: string;
  agent_version?: string;
  session_start_time?: string;
  duration_seconds?: number;
  transcript?: string;
  files_read?: string;
  files_written?: string;
  capsule_git_path?: string;
  trigger_type?: string;
}

/**
 * Create a new Time Capsule record.
 * Uses INSERT OR IGNORE to handle duplicate (repository_path, commit_sha) gracefully.
 */
export async function createTimeCapsule(input: CreateTimeCapsuleInput): Promise<TimeCapsule | null> {
  let db;
  try {
    db = await getDatabase();

    const result = db.prepare(`
      INSERT OR IGNORE INTO time_capsules (
        user_id, team_id, repository_path, commit_sha, commit_message,
        commit_branch, agent_name, agent_version, session_start_time,
        duration_seconds, transcript, files_read, files_written,
        capsule_git_path, trigger_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.user_id || null,
      input.team_id || null,
      input.repository_path,
      input.commit_sha,
      input.commit_message || null,
      input.commit_branch || null,
      input.agent_name || 'Claude Code',
      input.agent_version || null,
      input.session_start_time || null,
      input.duration_seconds || null,
      input.transcript || null,
      input.files_read || null,
      input.files_written || null,
      input.capsule_git_path || null,
      input.trigger_type || 'manual_session'
    );

    if (result.changes === 0) {
      // Duplicate - return existing record
      return getTimeCapsuleByShaInternal(db, input.repository_path, input.commit_sha);
    }

    // Fetch and return the created record
    return getTimeCapsuleByShaInternal(db, input.repository_path, input.commit_sha);
  } catch (error) {
    console.error('[Time Capsule DB] Failed to create capsule:', error);
    return null;
  } finally {
    closeDatabaseSafely(db);
  }
}

/**
 * Get a Time Capsule by commit SHA and repository path.
 */
export async function getTimeCapsuleBySha(
  repoPath: string,
  commitSha: string
): Promise<TimeCapsule | null> {
  let db;
  try {
    db = await getDatabase();
    return getTimeCapsuleByShaInternal(db, repoPath, commitSha);
  } catch (error) {
    console.error('[Time Capsule DB] Failed to get capsule by SHA:', error);
    return null;
  } finally {
    closeDatabaseSafely(db);
  }
}

/**
 * Internal helper - get capsule by SHA (reuses open db connection).
 */
function getTimeCapsuleByShaInternal(db: any, repoPath: string, commitSha: string): TimeCapsule | null {
  return db.prepare(
    'SELECT * FROM time_capsules WHERE repository_path = ? AND commit_sha = ?'
  ).get(repoPath, commitSha) as TimeCapsule | null;
}

/**
 * Get a Time Capsule by its ID.
 */
export async function getTimeCapsuleById(id: string): Promise<TimeCapsule | null> {
  let db;
  try {
    db = await getDatabase();
    return db.prepare('SELECT * FROM time_capsules WHERE id = ?').get(id) as TimeCapsule | null;
  } catch (error) {
    console.error('[Time Capsule DB] Failed to get capsule by ID:', error);
    return null;
  } finally {
    closeDatabaseSafely(db);
  }
}

/**
 * List Time Capsules for a repository, newest first.
 */
export async function getTimeCapsulesByRepo(
  repoPath: string,
  limit: number = 50
): Promise<TimeCapsule[]> {
  let db;
  try {
    db = await getDatabase();
    return db.prepare(
      'SELECT * FROM time_capsules WHERE repository_path = ? ORDER BY created_at DESC LIMIT ?'
    ).all(repoPath, limit) as TimeCapsule[];
  } catch (error) {
    console.error('[Time Capsule DB] Failed to get capsules by repo:', error);
    return [];
  } finally {
    closeDatabaseSafely(db);
  }
}

/**
 * List Time Capsules for a team, newest first.
 */
export async function getTimeCapsulesByTeam(
  teamId: string,
  limit: number = 50
): Promise<TimeCapsule[]> {
  let db;
  try {
    db = await getDatabase();
    return db.prepare(
      'SELECT * FROM time_capsules WHERE team_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(teamId, limit) as TimeCapsule[];
  } catch (error) {
    console.error('[Time Capsule DB] Failed to get capsules by team:', error);
    return [];
  } finally {
    closeDatabaseSafely(db);
  }
}

/**
 * Batch check which commit SHAs have associated Time Capsules.
 * Returns a map of SHA -> boolean for efficient UI rendering.
 */
export async function batchCheckCapsules(
  repoPath: string,
  commitShas: string[]
): Promise<Record<string, boolean>> {
  if (!commitShas.length) return {};

  let db;
  try {
    db = await getDatabase();

    // Use parameterized query with placeholders
    const placeholders = commitShas.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT commit_sha FROM time_capsules WHERE repository_path = ? AND commit_sha IN (${placeholders})`
    ).all(repoPath, ...commitShas) as Array<{ commit_sha: string }>;

    const found = new Set(rows.map(r => r.commit_sha));
    const result: Record<string, boolean> = {};
    for (const sha of commitShas) {
      result[sha] = found.has(sha);
    }
    return result;
  } catch (error) {
    console.error('[Time Capsule DB] Failed to batch check capsules:', error);
    return {};
  } finally {
    closeDatabaseSafely(db);
  }
}

/**
 * Update the git path after the Bridge CLI writes the capsule to the metadata branch.
 */
export async function updateTimeCapsuleGitPath(
  id: string,
  gitPath: string
): Promise<boolean> {
  let db;
  try {
    db = await getDatabase();
    const result = db.prepare(
      'UPDATE time_capsules SET capsule_git_path = ? WHERE id = ?'
    ).run(gitPath, id);
    return result.changes > 0;
  } catch (error) {
    console.error('[Time Capsule DB] Failed to update git path:', error);
    return false;
  } finally {
    closeDatabaseSafely(db);
  }
}

/**
 * Delete a Time Capsule by ID. Only the creator should be able to do this.
 */
export async function deleteTimeCapsule(id: string, userId: string): Promise<boolean> {
  let db;
  try {
    db = await getDatabase();
    const result = db.prepare(
      'DELETE FROM time_capsules WHERE id = ? AND user_id = ?'
    ).run(id, userId);
    return result.changes > 0;
  } catch (error) {
    console.error('[Time Capsule DB] Failed to delete capsule:', error);
    return false;
  } finally {
    closeDatabaseSafely(db);
  }
}
