import { getAgentHubDatabase } from './db';
import { removeWorktree } from './git-tracker';

const MAX_DURATION_MINUTES = parseInt(
  process.env.AGENT_HUB_MAX_RUN_DURATION_MINUTES || '60',
  10
);

interface ZombieRunRow {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  worktree_path: string | null;
}

export async function detectAndFixZombieRuns(): Promise<number> {
  const db = getAgentHubDatabase();
  const cutoff = new Date(Date.now() - MAX_DURATION_MINUTES * 60 * 1000).toISOString();

  const zombies = db
    .prepare(
      `SELECT id, task_id, user_id, started_at, worktree_path
       FROM agent_hub_runs
       WHERE status = 'running' AND started_at < ?`
    )
    .all(cutoff) as ZombieRunRow[];

  if (zombies.length === 0) return 0;

  const now = new Date().toISOString();

  const fixRun = db.prepare(
    `UPDATE agent_hub_runs
     SET status = 'failed', error_summary = 'Timed out', completed_at = ?
     WHERE id = ?`
  );

  const fixTask = db.prepare(
    `UPDATE agent_hub_tasks SET status = 'backlog' WHERE id = ? AND user_id = ?`
  );

  const fixAll = db.transaction(() => {
    for (const zombie of zombies) {
      fixRun.run(now, zombie.id);
      fixTask.run(zombie.task_id, zombie.user_id);
    }
  });

  const worktreesToClean = zombies
    .filter((z) => z.worktree_path)
    .map((z) => z.worktree_path!);

  fixAll();

  // Clean up worktrees outside the transaction (async I/O)
  for (const wt of worktreesToClean) {
    try {
      await removeWorktree(wt);
    } catch (err) {
      console.warn(`[zombie-detector] Failed to remove worktree ${wt}:`, err);
    }
  }

  console.log(`[zombie-detector] Fixed ${zombies.length} zombie run(s)`);
  return zombies.length;
}
