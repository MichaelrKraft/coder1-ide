/**
 * Johnny5 SQLite Database Foundation
 *
 * This module provides the core database layer for Johnny5, Coder1's autonomous AI employee.
 * It handles:
 * - Session tracking and message history
 * - Task management for autonomous operations
 * - Audit logging for security and compliance
 * - Usage statistics for analytics
 * - User profile and preferences
 *
 * Database Location: ~/.coder1/johnny5.db
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface Session {
  id: string;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  tokens_used: number;
  status: 'active' | 'completed' | 'archived' | 'error';
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: 'research' | 'code_review' | 'documentation' | 'monitoring' | 'custom' | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  result: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  details: string | null;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  api_key_hash: string | null;
  roles: string[];
  platforms: string[];
  projects: string[];
  goals: string[];
  preferences: Record<string, unknown>;
  proactivity_level: 'low' | 'medium' | 'high';
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  id: string;
  date: string;
  tokens_input: number;
  tokens_output: number;
  sessions_count: number;
  tasks_count: number;
}

// ============================================================================
// Database Singleton
// ============================================================================

const DB_DIR = join(homedir(), '.coder1');
const DB_PATH = join(DB_DIR, 'johnny5.db');
const BACKUP_DIR = join(DB_DIR, 'backups');

let db: Database.Database | null = null;

/**
 * Get the database instance, initializing if necessary
 */
export function getDb(): Database.Database {
  if (!db) {
    initializeDbSync();
  }
  return db!;
}

/**
 * Initialize the database synchronously
 */
function initializeDbSync(): void {
  // Ensure directory exists
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  // Create database connection
  db = new Database(DB_PATH);

  // Enable foreign keys and WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  createTables(db);
}

/**
 * Initialize the database (async wrapper for consistency)
 */
export async function initializeDb(): Promise<void> {
  initializeDbSync();
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Create all required tables
 */
function createTables(database: Database.Database): void {
  database.exec(`
    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      message_count INTEGER DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived', 'error'))
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      tokens INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT CHECK(type IN ('research', 'code_review', 'documentation', 'monitoring', 'custom')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    -- Audit log table
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User profile table
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY DEFAULT 'default',
      api_key_hash TEXT,
      roles TEXT,
      platforms TEXT,
      projects TEXT,
      goals TEXT,
      preferences TEXT,
      proactivity_level TEXT DEFAULT 'medium',
      permissions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Usage tracking table
    CREATE TABLE IF NOT EXISTS usage_stats (
      id TEXT PRIMARY KEY,
      date DATE NOT NULL,
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      sessions_count INTEGER DEFAULT 0,
      tasks_count INTEGER DEFAULT 0,
      UNIQUE(date)
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);
  `);
}

// ============================================================================
// Session Operations
// ============================================================================

/**
 * Create a new session
 */
export async function createSession(name?: string): Promise<Session> {
  const database = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO sessions (id, name, started_at, status)
    VALUES (?, ?, ?, 'active')
  `);

  stmt.run(id, name ?? null, now);

  // Log the session creation
  await logAudit('session_created', { sessionId: id, name });

  return {
    id,
    name: name ?? null,
    started_at: now,
    ended_at: null,
    message_count: 0,
    tokens_used: 0,
    status: 'active'
  };
}

/**
 * Get a session by ID
 */
export async function getSession(id: string): Promise<Session | null> {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM sessions WHERE id = ?');
  const row = stmt.get(id) as Session | undefined;
  return row ?? null;
}

/**
 * List sessions with pagination
 */
export async function listSessions(limit: number = 50, offset: number = 0): Promise<Session[]> {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM sessions
    ORDER BY started_at DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(limit, offset) as Session[];
}

/**
 * Update a session
 */
export async function updateSession(id: string, data: Partial<Session>): Promise<void> {
  const database = getDb();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.ended_at !== undefined) {
    updates.push('ended_at = ?');
    values.push(data.ended_at);
  }
  if (data.message_count !== undefined) {
    updates.push('message_count = ?');
    values.push(data.message_count);
  }
  if (data.tokens_used !== undefined) {
    updates.push('tokens_used = ?');
    values.push(data.tokens_used);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }

  if (updates.length === 0) return;

  values.push(id);
  const stmt = database.prepare(`
    UPDATE sessions SET ${updates.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);
}

/**
 * Archive a session
 */
export async function archiveSession(id: string): Promise<void> {
  const database = getDb();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    UPDATE sessions
    SET status = 'archived', ended_at = COALESCE(ended_at, ?)
    WHERE id = ?
  `);
  stmt.run(now, id);

  await logAudit('session_archived', { sessionId: id });
}

// ============================================================================
// Message Operations
// ============================================================================

/**
 * Add a message to a session
 */
export async function addMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  tokens: number = 0
): Promise<Message> {
  const database = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO messages (id, session_id, role, content, tokens, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, sessionId, role, content, tokens, now);

  // Update session message count and tokens
  const updateStmt = database.prepare(`
    UPDATE sessions
    SET message_count = message_count + 1,
        tokens_used = tokens_used + ?
    WHERE id = ?
  `);
  updateStmt.run(tokens, sessionId);

  return {
    id,
    session_id: sessionId,
    role,
    content,
    tokens,
    created_at: now
  };
}

/**
 * Get messages for a session
 */
export async function getMessages(sessionId: string, limit: number = 100): Promise<Message[]> {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM messages
    WHERE session_id = ?
    ORDER BY created_at ASC
    LIMIT ?
  `);
  return stmt.all(sessionId, limit) as Message[];
}

/**
 * Get message count for a session
 */
export async function getMessageCount(sessionId: string): Promise<number> {
  const database = getDb();
  const stmt = database.prepare('SELECT COUNT(*) as count FROM messages WHERE session_id = ?');
  const result = stmt.get(sessionId) as { count: number };
  return result.count;
}

// ============================================================================
// Task Operations
// ============================================================================

/**
 * Create a new task
 */
export async function createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
  const database = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO tasks (id, title, description, type, priority, status, result, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    task.title,
    task.description ?? null,
    task.type ?? null,
    task.priority ?? 'medium',
    task.status ?? 'pending',
    task.result ?? null,
    now,
    task.completed_at ?? null
  );

  await logAudit('task_created', { taskId: id, title: task.title, type: task.type });

  // Update today's usage stats
  await incrementTaskCount();

  return {
    id,
    title: task.title,
    description: task.description ?? null,
    type: task.type ?? null,
    priority: task.priority ?? 'medium',
    status: task.status ?? 'pending',
    result: task.result ?? null,
    created_at: now,
    completed_at: task.completed_at ?? null
  };
}

/**
 * Get a task by ID
 */
export async function getTask(id: string): Promise<Task | null> {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM tasks WHERE id = ?');
  const row = stmt.get(id) as Task | undefined;
  return row ?? null;
}

/**
 * List tasks by status
 */
export async function listTasks(status?: string): Promise<Task[]> {
  const database = getDb();

  if (status) {
    const stmt = database.prepare(`
      SELECT * FROM tasks
      WHERE status = ?
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at DESC
    `);
    return stmt.all(status) as Task[];
  }

  const stmt = database.prepare(`
    SELECT * FROM tasks
    ORDER BY
      CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      created_at DESC
  `);
  return stmt.all() as Task[];
}

/**
 * Update a task
 */
export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  const database = getDb();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.priority !== undefined) {
    updates.push('priority = ?');
    values.push(data.priority);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);

    // Auto-set completed_at when status becomes completed
    if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
      updates.push('completed_at = ?');
      values.push(new Date().toISOString());
    }
  }
  if (data.result !== undefined) {
    updates.push('result = ?');
    values.push(data.result);
  }

  if (updates.length === 0) return;

  values.push(id);
  const stmt = database.prepare(`
    UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  await logAudit('task_updated', { taskId: id, updates: Object.keys(data) });
}

// ============================================================================
// Audit Operations
// ============================================================================

/**
 * Log an audit entry
 */
export async function logAudit(action: string, details?: unknown): Promise<void> {
  const database = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO audit_log (id, action, details, timestamp)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, action, details ? JSON.stringify(details) : null, now);
}

/**
 * Get audit log entries
 */
export async function getAuditLog(limit: number = 100): Promise<AuditEntry[]> {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM audit_log
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as AuditEntry[];

  // Parse details JSON
  return rows.map(row => ({
    ...row,
    details: row.details ? JSON.parse(row.details) : null
  }));
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Ensure today's usage stats record exists
 */
function ensureTodayStats(database: Database.Database): void {
  const today = getTodayDate();
  const id = randomUUID();

  const stmt = database.prepare(`
    INSERT OR IGNORE INTO usage_stats (id, date, tokens_input, tokens_output, sessions_count, tasks_count)
    VALUES (?, ?, 0, 0, 0, 0)
  `);
  stmt.run(id, today);
}

/**
 * Track token usage
 */
export async function trackUsage(tokensInput: number, tokensOutput: number): Promise<void> {
  const database = getDb();
  const today = getTodayDate();

  ensureTodayStats(database);

  const stmt = database.prepare(`
    UPDATE usage_stats
    SET tokens_input = tokens_input + ?,
        tokens_output = tokens_output + ?
    WHERE date = ?
  `);
  stmt.run(tokensInput, tokensOutput, today);
}

/**
 * Increment session count for today
 */
async function incrementSessionCount(): Promise<void> {
  const database = getDb();
  const today = getTodayDate();

  ensureTodayStats(database);

  const stmt = database.prepare(`
    UPDATE usage_stats SET sessions_count = sessions_count + 1 WHERE date = ?
  `);
  stmt.run(today);
}

/**
 * Increment task count for today
 */
async function incrementTaskCount(): Promise<void> {
  const database = getDb();
  const today = getTodayDate();

  ensureTodayStats(database);

  const stmt = database.prepare(`
    UPDATE usage_stats SET tasks_count = tasks_count + 1 WHERE date = ?
  `);
  stmt.run(today);
}

/**
 * Get usage stats for the last N days
 */
export async function getUsageStats(days: number = 30): Promise<UsageStats[]> {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM usage_stats
    ORDER BY date DESC
    LIMIT ?
  `);
  return stmt.all(days) as UsageStats[];
}

/**
 * Get today's usage stats
 */
export async function getTodayUsage(): Promise<UsageStats> {
  const database = getDb();
  const today = getTodayDate();

  ensureTodayStats(database);

  const stmt = database.prepare('SELECT * FROM usage_stats WHERE date = ?');
  return stmt.get(today) as UsageStats;
}

// ============================================================================
// User Profile Operations
// ============================================================================

/**
 * Get the user profile
 */
export async function getProfile(): Promise<UserProfile | null> {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM user_profile WHERE id = 'default'");
  const row = stmt.get() as {
    id: string;
    api_key_hash: string | null;
    roles: string | null;
    platforms: string | null;
    projects: string | null;
    goals: string | null;
    preferences: string | null;
    proactivity_level: string;
    permissions: string | null;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    api_key_hash: row.api_key_hash,
    roles: row.roles ? JSON.parse(row.roles) : [],
    platforms: row.platforms ? JSON.parse(row.platforms) : [],
    projects: row.projects ? JSON.parse(row.projects) : [],
    goals: row.goals ? JSON.parse(row.goals) : [],
    preferences: row.preferences ? JSON.parse(row.preferences) : {},
    proactivity_level: row.proactivity_level as 'low' | 'medium' | 'high',
    permissions: row.permissions ? JSON.parse(row.permissions) : {},
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Save user profile (upsert)
 */
export async function saveProfile(profile: Partial<UserProfile>): Promise<void> {
  const database = getDb();
  const now = new Date().toISOString();

  // Check if profile exists
  const existing = await getProfile();

  if (existing) {
    // Update existing profile
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (profile.api_key_hash !== undefined) {
      updates.push('api_key_hash = ?');
      values.push(profile.api_key_hash);
    }
    if (profile.roles !== undefined) {
      updates.push('roles = ?');
      values.push(JSON.stringify(profile.roles));
    }
    if (profile.platforms !== undefined) {
      updates.push('platforms = ?');
      values.push(JSON.stringify(profile.platforms));
    }
    if (profile.projects !== undefined) {
      updates.push('projects = ?');
      values.push(JSON.stringify(profile.projects));
    }
    if (profile.goals !== undefined) {
      updates.push('goals = ?');
      values.push(JSON.stringify(profile.goals));
    }
    if (profile.preferences !== undefined) {
      updates.push('preferences = ?');
      values.push(JSON.stringify(profile.preferences));
    }
    if (profile.proactivity_level !== undefined) {
      updates.push('proactivity_level = ?');
      values.push(profile.proactivity_level);
    }
    if (profile.permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(profile.permissions));
    }

    const stmt = database.prepare(`
      UPDATE user_profile SET ${updates.join(', ')} WHERE id = 'default'
    `);
    stmt.run(...values);
  } else {
    // Insert new profile
    const stmt = database.prepare(`
      INSERT INTO user_profile (id, api_key_hash, roles, platforms, projects, goals, preferences, proactivity_level, permissions, created_at, updated_at)
      VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      profile.api_key_hash ?? null,
      JSON.stringify(profile.roles ?? []),
      JSON.stringify(profile.platforms ?? []),
      JSON.stringify(profile.projects ?? []),
      JSON.stringify(profile.goals ?? []),
      JSON.stringify(profile.preferences ?? {}),
      profile.proactivity_level ?? 'medium',
      JSON.stringify(profile.permissions ?? {}),
      now,
      now
    );
  }

  await logAudit('profile_updated', { fields: Object.keys(profile) });
}

// ============================================================================
// Backup Operations
// ============================================================================

/**
 * Create a backup of the database
 */
export async function backupDatabase(): Promise<string> {
  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(BACKUP_DIR, `johnny5-${timestamp}.db`);

  // Close any existing connection to ensure clean copy
  const database = getDb();

  // Use SQLite backup API
  database.backup(backupPath)
    .then(() => {
      console.log(`Backup created: ${backupPath}`);
    })
    .catch((err: Error) => {
      console.error('Backup failed:', err);
      // Fallback to file copy
      copyFileSync(DB_PATH, backupPath);
    });

  await logAudit('database_backup', { path: backupPath });

  return backupPath;
}

/**
 * Restore database from a backup
 */
export async function restoreDatabase(backupPath: string): Promise<void> {
  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  // Close current database
  closeDb();

  // Create a backup of current database before restore
  const preRestoreBackup = join(BACKUP_DIR, `pre-restore-${Date.now()}.db`);
  if (existsSync(DB_PATH)) {
    copyFileSync(DB_PATH, preRestoreBackup);
  }

  // Restore from backup
  copyFileSync(backupPath, DB_PATH);

  // Reinitialize
  initializeDbSync();

  await logAudit('database_restored', { from: backupPath, preRestoreBackup });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  sessions: number;
  messages: number;
  tasks: number;
  auditEntries: number;
  dbSizeBytes: number;
}> {
  const database = getDb();

  const sessions = (database.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
  const messages = (database.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }).count;
  const tasks = (database.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }).count;
  const auditEntries = (database.prepare('SELECT COUNT(*) as count FROM audit_log').get() as { count: number }).count;

  // Get database file size
  const { statSync } = await import('fs');
  let dbSizeBytes = 0;
  try {
    dbSizeBytes = statSync(DB_PATH).size;
  } catch {
    // File might not exist yet
  }

  return {
    sessions,
    messages,
    tasks,
    auditEntries,
    dbSizeBytes
  };
}

/**
 * Clean up old data based on retention policies
 */
export async function cleanupOldData(options: {
  sessionsOlderThanDays?: number;
  auditLogsOlderThanDays?: number;
  usageStatsOlderThanDays?: number;
} = {}): Promise<{
  deletedSessions: number;
  deletedAuditLogs: number;
  deletedUsageStats: number;
}> {
  const database = getDb();
  const {
    sessionsOlderThanDays = 90,
    auditLogsOlderThanDays = 30,
    usageStatsOlderThanDays = 365
  } = options;

  const sessionsCutoff = new Date();
  sessionsCutoff.setDate(sessionsCutoff.getDate() - sessionsOlderThanDays);

  const auditCutoff = new Date();
  auditCutoff.setDate(auditCutoff.getDate() - auditLogsOlderThanDays);

  const usageCutoff = new Date();
  usageCutoff.setDate(usageCutoff.getDate() - usageStatsOlderThanDays);

  // Delete old archived sessions (messages will cascade delete)
  const deletedSessions = database.prepare(`
    DELETE FROM sessions
    WHERE status = 'archived' AND started_at < ?
  `).run(sessionsCutoff.toISOString()).changes;

  // Delete old audit logs
  const deletedAuditLogs = database.prepare(`
    DELETE FROM audit_log WHERE timestamp < ?
  `).run(auditCutoff.toISOString()).changes;

  // Delete old usage stats
  const deletedUsageStats = database.prepare(`
    DELETE FROM usage_stats WHERE date < ?
  `).run(usageCutoff.toISOString().split('T')[0]).changes;

  await logAudit('data_cleanup', {
    deletedSessions,
    deletedAuditLogs,
    deletedUsageStats,
    retentionPolicies: options
  });

  return {
    deletedSessions,
    deletedAuditLogs,
    deletedUsageStats
  };
}

// ============================================================================
// Export Database Path for External Use
// ============================================================================

export const DATABASE_PATH = DB_PATH;
export const DATABASE_DIR = DB_DIR;
export const BACKUP_PATH = BACKUP_DIR;
