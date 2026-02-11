/**
 * Crew Memory Store
 *
 * This service manages persistent memory for Johnny5 Crew members.
 * It tracks task history, results, and provides context for each crew member
 * to enable continuity across sessions.
 *
 * Database: ~/.coder1/johnny5.db (crew_history table)
 */

import { getDb, logAudit } from '../../lib/johnny5-db';

// ============================================================================
// Types
// ============================================================================

/**
 * A single task entry in crew history
 */
export interface CrewTaskEntry {
  /** The task description or prompt */
  task: string;
  /** The result or output of the task */
  result: string;
  /** When the task was completed */
  created_at: string;
}

/**
 * Crew memory context for a specific crew member
 */
export interface CrewMemory {
  /** Recent tasks completed by this crew member */
  recentTasks: CrewTaskEntry[];
  /** AI-generated summary of the crew member's work */
  summary: string;
  /** Total number of tasks completed by this crew member */
  taskCount: number;
}

/**
 * Raw database row from crew_history table
 */
interface CrewHistoryRow {
  id: number;
  crew_member: string;
  task: string;
  result: string | null;
  model_used: string | null;
  created_at: string;
}

// ============================================================================
// Crew Memory Store
// ============================================================================

/**
 * Manages persistent memory for Johnny5 Crew members.
 *
 * Each crew member (Architect, Developer, QA, etc.) has their own history
 * of tasks and results. This enables:
 * - Context continuity across sessions
 * - Learning from past work
 * - Building personalized expertise
 *
 * @example
 * ```typescript
 * const store = new CrewMemoryStore();
 *
 * // Save a completed task
 * await store.saveResult('architect', 'Design user auth flow', 'Created OAuth2 flow...', 'claude-sonnet');
 *
 * // Get context for a crew member
 * const memory = await store.getContext('architect');
 * console.log(`Architect has completed ${memory.taskCount} tasks`);
 * ```
 */
export class CrewMemoryStore {
  /**
   * Get memory context for a specific crew member.
   *
   * Returns recent tasks, a summary of their work, and total task count.
   * This context can be injected into the crew member's system prompt
   * to provide continuity.
   *
   * @param crewMember - The crew member identifier (e.g., 'architect', 'developer')
   * @param limit - Maximum number of recent tasks to return (default: 10)
   * @returns Memory context for the crew member
   */
  async getContext(crewMember: string, limit: number = 10): Promise<CrewMemory> {
    const database = getDb();

    // Get recent tasks for this crew member
    const recentStmt = database.prepare(`
      SELECT task, result, created_at
      FROM crew_history
      WHERE crew_member = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = recentStmt.all(crewMember, limit) as Array<{
      task: string;
      result: string | null;
      created_at: string;
    }>;

    // Get total task count
    const countStmt = database.prepare(`
      SELECT COUNT(*) as count
      FROM crew_history
      WHERE crew_member = ?
    `);
    const countResult = countStmt.get(crewMember) as { count: number };

    // Build recent tasks array
    const recentTasks: CrewTaskEntry[] = rows.map((row) => ({
      task: row.task,
      result: row.result || '',
      created_at: row.created_at,
    }));

    // Generate a simple summary based on recent activity
    const summary = this.generateSummary(crewMember, recentTasks, countResult.count);

    return {
      recentTasks,
      summary,
      taskCount: countResult.count,
    };
  }

  /**
   * Save a task result for a crew member.
   *
   * This stores the task, result, and model used in the database
   * for future context retrieval.
   *
   * @param crewMember - The crew member identifier
   * @param task - The task description or prompt
   * @param result - The result or output of the task
   * @param modelUsed - The AI model used (e.g., 'claude-sonnet', 'gpt-4')
   */
  async saveResult(
    crewMember: string,
    task: string,
    result: string,
    modelUsed: string
  ): Promise<void> {
    const database = getDb();

    const stmt = database.prepare(`
      INSERT INTO crew_history (crew_member, task, result, model_used)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(crewMember, task, result, modelUsed);

    // Log the action for audit trail
    await logAudit('crew_task_saved', {
      crewMember,
      taskPreview: task.substring(0, 100),
      modelUsed,
    });
  }

  /**
   * Clear all history for a specific crew member.
   *
   * Use with caution - this permanently deletes all task history
   * for the specified crew member.
   *
   * @param crewMember - The crew member identifier
   * @returns Number of records deleted
   */
  async clearHistory(crewMember: string): Promise<number> {
    const database = getDb();

    const stmt = database.prepare(`
      DELETE FROM crew_history
      WHERE crew_member = ?
    `);
    const result = stmt.run(crewMember);

    // Log the action for audit trail
    await logAudit('crew_history_cleared', {
      crewMember,
      deletedCount: result.changes,
    });

    return result.changes;
  }

  /**
   * Get all crew members with history.
   *
   * Returns a list of all crew member identifiers that have
   * at least one task in their history.
   *
   * @returns Array of crew member identifiers
   */
  async getActiveCrewMembers(): Promise<string[]> {
    const database = getDb();

    const stmt = database.prepare(`
      SELECT DISTINCT crew_member
      FROM crew_history
      ORDER BY crew_member
    `);
    const rows = stmt.all() as Array<{ crew_member: string }>;

    return rows.map((row) => row.crew_member);
  }

  /**
   * Get statistics for all crew members.
   *
   * Returns task counts and last activity for each crew member.
   *
   * @returns Map of crew member to their stats
   */
  async getCrewStats(): Promise<
    Map<string, { taskCount: number; lastActive: string | null }>
  > {
    const database = getDb();

    const stmt = database.prepare(`
      SELECT
        crew_member,
        COUNT(*) as task_count,
        MAX(created_at) as last_active
      FROM crew_history
      GROUP BY crew_member
      ORDER BY task_count DESC
    `);
    const rows = stmt.all() as Array<{
      crew_member: string;
      task_count: number;
      last_active: string | null;
    }>;

    const stats = new Map<
      string,
      { taskCount: number; lastActive: string | null }
    >();
    for (const row of rows) {
      stats.set(row.crew_member, {
        taskCount: row.task_count,
        lastActive: row.last_active,
      });
    }

    return stats;
  }

  /**
   * Search crew history for tasks matching a query.
   *
   * Performs a case-insensitive search on task and result text.
   *
   * @param query - Search query string
   * @param crewMember - Optional: limit search to specific crew member
   * @param limit - Maximum results to return (default: 20)
   * @returns Matching history rows
   */
  async searchHistory(
    query: string,
    crewMember?: string,
    limit: number = 20
  ): Promise<CrewHistoryRow[]> {
    const database = getDb();
    const searchPattern = `%${query}%`;

    let stmt;
    if (crewMember) {
      stmt = database.prepare(`
        SELECT id, crew_member, task, result, model_used, created_at
        FROM crew_history
        WHERE crew_member = ?
          AND (task LIKE ? OR result LIKE ?)
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(crewMember, searchPattern, searchPattern, limit) as CrewHistoryRow[];
    } else {
      stmt = database.prepare(`
        SELECT id, crew_member, task, result, model_used, created_at
        FROM crew_history
        WHERE task LIKE ? OR result LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(searchPattern, searchPattern, limit) as CrewHistoryRow[];
    }
  }

  /**
   * Generate a simple summary of crew member activity.
   *
   * @param crewMember - The crew member identifier
   * @param recentTasks - Recent tasks for context
   * @param totalCount - Total number of tasks
   * @returns A human-readable summary string
   */
  private generateSummary(
    crewMember: string,
    recentTasks: CrewTaskEntry[],
    totalCount: number
  ): string {
    if (totalCount === 0) {
      return `${crewMember} has no task history yet.`;
    }

    if (totalCount === 1) {
      return `${crewMember} has completed 1 task.`;
    }

    const formattedName = crewMember.charAt(0).toUpperCase() + crewMember.slice(1);

    if (recentTasks.length === 0) {
      return `${formattedName} has completed ${totalCount} tasks.`;
    }

    // Get the most recent task preview
    const lastTask = recentTasks[0];
    const taskPreview =
      lastTask.task.length > 50
        ? lastTask.task.substring(0, 50) + '...'
        : lastTask.task;

    return `${formattedName} has completed ${totalCount} tasks. Last task: "${taskPreview}"`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: CrewMemoryStore | null = null;

/**
 * Get the singleton CrewMemoryStore instance.
 *
 * @returns The shared CrewMemoryStore instance
 */
export function getCrewMemoryStore(): CrewMemoryStore {
  if (!instance) {
    instance = new CrewMemoryStore();
  }
  return instance;
}

// Default export for convenience
export default CrewMemoryStore;
