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
 * - Unified memory integration with ManusLive
 *
 * Database Location: ~/.coder1/johnny5.db
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { randomUUID, createHash } from 'crypto';

// Centralized data paths for persistent storage (fixes production memory issue)
import { DATA_DIR, JOHNNY5_DB_PATH, BACKUP_DIR as BACKUP_PATH, ensureDataDir } from './data-paths';

// Try to load sqlite-vec for vector search (optional, graceful degradation)
let sqliteVecLoaded = false;
let vectorTableCreated = false; // Track if vector table was actually created
try {
  // sqlite-vec provides vector similarity search
  // If it fails to load, we fall back to keyword-only search
  const sqliteVec = require('sqlite-vec');
  sqliteVecLoaded = true;
  console.log('[Johnny5 DB] sqlite-vec extension loaded successfully');
} catch (err) {
  console.warn('[Johnny5 DB] sqlite-vec not available, falling back to keyword-only search');
}

// ManusLive Memory Integration
import {
  getManusLiveMemory,
  getManusLiveUserProfile,
  getUnifiedManusLiveContext,
  isManusLiveInstalled,
  clearManusLiveCache,
  type ManusLiveMemory,
  type ManusLiveUserProfile,
  type UnifiedMemoryContext,
} from './manuslive-memory';

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
// Memory System Types
// ============================================================================

export interface MemoryChunk {
  id: string;
  source_type: 'manuslive_memory' | 'manuslive_user' | 'session';
  source_id: string;
  content: string;
  content_hash: string;
  start_line: number | null;
  end_line: number | null;
  token_count: number;
  heading?: string;
  section_type?: string;
  created_at: string;
  updated_at: string;
}

export interface MemorySearchResult {
  chunk_id: string;
  content: string;
  source_type: string;
  source_id: string;
  start_line: number | null;
  end_line: number | null;
  vector_score: number;
  keyword_score: number;
  combined_score: number;
}

export interface EmbeddingMetadata {
  id: string;
  model_name: string;
  model_version: string;
  dimensions: number;
  created_at: string;
}

export interface MemoryStats {
  total_chunks: number;
  manuslive_chunks: number;
  session_chunks: number;
  last_indexed: string | null;
  embedding_model: string | null;
}

/**
 * Check if sqlite-vec extension is available AND the vector table was created
 */
export function isVectorSearchAvailable(): boolean {
  return sqliteVecLoaded && vectorTableCreated;
}

/**
 * Check if sqlite-vec extension loaded (regardless of vector table creation)
 */
export function isSqliteVecLoaded(): boolean {
  return sqliteVecLoaded;
}

/**
 * Generate SHA-256 hash for content deduplication
 */
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// ============================================================================
// Database Singleton
// ============================================================================

// Use centralized data paths for production persistence
const DB_DIR = DATA_DIR;
const DB_PATH = JOHNNY5_DB_PATH;
const BACKUP_DIR = BACKUP_PATH;

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
  // Ensure all data directories exist (including backups, summaries, exports)
  ensureDataDir();

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

    -- =========================================================================
    -- Memory System Tables (for semantic search)
    -- =========================================================================

    -- Memory chunks with metadata
    CREATE TABLE IF NOT EXISTS memory_chunks (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL CHECK(source_type IN ('manuslive_memory', 'manuslive_user', 'session')),
      source_id TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      start_line INTEGER,
      end_line INTEGER,
      token_count INTEGER DEFAULT 0,
      heading TEXT,
      section_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, content_hash)
    );

    -- Embedding metadata (tracks model version for migration)
    CREATE TABLE IF NOT EXISTS embedding_metadata (
      id TEXT PRIMARY KEY DEFAULT 'current',
      model_name TEXT NOT NULL,
      model_version TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Full-text search index for keyword search
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
      content,
      heading,
      section_type,
      content='memory_chunks',
      content_rowid='rowid',
      tokenize='porter unicode61'
    );

    -- Triggers to keep FTS index in sync
    CREATE TRIGGER IF NOT EXISTS memory_chunks_ai AFTER INSERT ON memory_chunks BEGIN
      INSERT INTO memory_fts(rowid, content, heading, section_type)
      VALUES (new.rowid, new.content, new.heading, new.section_type);
    END;

    CREATE TRIGGER IF NOT EXISTS memory_chunks_ad AFTER DELETE ON memory_chunks BEGIN
      INSERT INTO memory_fts(memory_fts, rowid, content, heading, section_type)
      VALUES ('delete', old.rowid, old.content, old.heading, old.section_type);
    END;

    CREATE TRIGGER IF NOT EXISTS memory_chunks_au AFTER UPDATE ON memory_chunks BEGIN
      INSERT INTO memory_fts(memory_fts, rowid, content, heading, section_type)
      VALUES ('delete', old.rowid, old.content, old.heading, old.section_type);
      INSERT INTO memory_fts(rowid, content, heading, section_type)
      VALUES (new.rowid, new.content, new.heading, new.section_type);
    END;

    -- Indexes for memory chunks
    CREATE INDEX IF NOT EXISTS idx_memory_chunks_source ON memory_chunks(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_memory_chunks_hash ON memory_chunks(content_hash);
    CREATE INDEX IF NOT EXISTS idx_memory_chunks_updated ON memory_chunks(updated_at);

    -- =========================================================================
    -- Memory Intelligence Tables (for AI-powered fact extraction)
    -- =========================================================================

    -- Extracted facts from conversations
    CREATE TABLE IF NOT EXISTS extracted_facts (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      fact_type TEXT NOT NULL CHECK(fact_type IN ('personal', 'preference', 'project', 'technical', 'goal')),
      fact_key TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      confidence REAL DEFAULT 0.8 CHECK(confidence >= 0 AND confidence <= 1),
      source_message_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_referenced TEXT,
      reference_count INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
    );

    -- Learned patterns from user behavior
    CREATE TABLE IF NOT EXISTS learned_patterns (
      id TEXT PRIMARY KEY,
      pattern_type TEXT NOT NULL CHECK(pattern_type IN ('workflow', 'coding_style', 'preference', 'time_pattern', 'communication')),
      pattern_description TEXT NOT NULL,
      evidence_count INTEGER DEFAULT 1,
      first_observed TEXT DEFAULT CURRENT_TIMESTAMP,
      last_observed TEXT DEFAULT CURRENT_TIMESTAMP,
      confidence REAL DEFAULT 0.5 CHECK(confidence >= 0 AND confidence <= 1),
      actionable INTEGER DEFAULT 0,
      suggested_action TEXT
    );

    -- Self-improvement tracking
    CREATE TABLE IF NOT EXISTS self_improvement_log (
      id TEXT PRIMARY KEY,
      improvement_type TEXT NOT NULL CHECK(improvement_type IN ('skill_learned', 'pattern_detected', 'feedback_received', 'behavior_adjusted')),
      description TEXT NOT NULL,
      impact_score REAL DEFAULT 0.5 CHECK(impact_score >= 0 AND impact_score <= 1),
      applied INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for new tables
    CREATE INDEX IF NOT EXISTS idx_facts_type ON extracted_facts(fact_type);
    CREATE INDEX IF NOT EXISTS idx_facts_key ON extracted_facts(fact_key);
    CREATE INDEX IF NOT EXISTS idx_facts_session ON extracted_facts(session_id);
    CREATE INDEX IF NOT EXISTS idx_patterns_type ON learned_patterns(pattern_type);
    CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON learned_patterns(confidence);
    CREATE INDEX IF NOT EXISTS idx_improvement_type ON self_improvement_log(improvement_type);
  `);

  // Create vector table if sqlite-vec is available
  if (sqliteVecLoaded) {
    try {
      database.exec(`
        -- Vector embeddings table (sqlite-vec)
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(
          chunk_id TEXT PRIMARY KEY,
          embedding FLOAT[768]
        );
      `);
      vectorTableCreated = true;
      console.log('[Johnny5 DB] Vector table created successfully');
    } catch (err) {
      vectorTableCreated = false;
      console.warn('[Johnny5 DB] Failed to create vector table:', err);
      console.log('[Johnny5 DB] Falling back to keyword-only search');
    }
  }
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
// Security Warning Operations
// ============================================================================

/**
 * Save a security warning to the audit_log table
 */
export async function saveSecurityWarning(warning: {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: Date;
  dismissed: boolean;
  source?: string;
}): Promise<void> {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO audit_log (id, action, details, timestamp)
    VALUES (?, 'security_warning', ?, ?)
  `);
  stmt.run(
    warning.id,
    JSON.stringify({
      type: warning.type,
      message: warning.message,
      severity: warning.severity,
      dismissed: warning.dismissed,
      source: warning.source,
    }),
    warning.timestamp.toISOString()
  );
}

/**
 * Get security warnings from the audit_log table
 */
export async function getSecurityWarnings(limit: number = 100): Promise<Array<{
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
  dismissed: boolean;
  source?: string;
}>> {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, details, timestamp FROM audit_log
    WHERE action = 'security_warning'
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as Array<{ id: string; details: string; timestamp: string }>;

  return rows.map(row => {
    const details = JSON.parse(row.details);
    return {
      id: row.id,
      type: details.type || 'unknown',
      message: details.message || '',
      severity: details.severity || 'low',
      timestamp: row.timestamp,
      dismissed: details.dismissed || false,
      source: details.source,
    };
  });
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
// Unified Context (ManusLive + Local Johnny5 Integration)
// ============================================================================

/**
 * Unified context combining ManusLive memory and local Johnny5 profile
 */
export interface UnifiedJohnny5Context {
  /** Local Johnny5 profile from SQLite database */
  localProfile: UserProfile | null;
  /** ManusLive MEMORY.md content (facts, preferences, context, goals) */
  manusLiveMemory: ManusLiveMemory | null;
  /** ManusLive USER.md content (detailed user profile) */
  manusLiveUserProfile: ManusLiveUserProfile | null;
  /** Whether ManusLive is installed */
  manusLiveInstalled: boolean;
  /** Combined human-readable context for AI prompts */
  contextForAI: string;
  /** When this context was generated */
  generatedAt: string;
}

/**
 * Get unified context combining ManusLive memory with local Johnny5 profile
 *
 * This is the primary function to call when building context for Johnny5's AI.
 * It combines:
 * 1. ManusLive MEMORY.md - Facts, preferences, context, goals from other channels
 * 2. ManusLive USER.md - Detailed user profile from other channels
 * 3. Local johnny5.db profile - Settings and preferences specific to Coder1
 *
 * @param forceRefresh - Skip ManusLive cache and read fresh from disk
 * @returns Unified context object with all available memory
 *
 * @example
 * ```typescript
 * const context = await getUnifiedContext();
 *
 * // Use in AI prompt
 * const systemPrompt = `
 *   You are Johnny5, an AI assistant.
 *   ${context.contextForAI}
 * `;
 *
 * // Check data sources
 * if (context.manusLiveInstalled) {
 *   console.log('Cross-channel memory available');
 * }
 * ```
 */
export async function getUnifiedContext(forceRefresh = false): Promise<UnifiedJohnny5Context> {
  // Fetch all data sources in parallel
  const [localProfile, manusLiveContext] = await Promise.all([
    getProfile(),
    getUnifiedManusLiveContext(forceRefresh),
  ]);

  // Build the combined context for AI
  const contextParts: string[] = [];

  // Add user identification - prefer ManusLive, fallback to database profile
  if (manusLiveContext.userProfile?.basicInfo.name) {
    const { name, role, background } = manusLiveContext.userProfile.basicInfo;
    contextParts.push(`## About the User`);
    contextParts.push(`- Name: ${name}`);
    if (role) contextParts.push(`- Role: ${role}`);
    if (background) contextParts.push(`- Background: ${background}`);
  } else if (localProfile) {
    // FALLBACK: Use database profile when ManusLive not available (production)
    const prefs = localProfile.preferences as Record<string, unknown>;
    const name = prefs?.name || prefs?.userName;
    const background = prefs?.background || prefs?.bio;
    const favoriteColor = prefs?.favoriteColor;
    const workPatterns = prefs?.workPatterns;

    if (name || localProfile.roles.length > 0 || background) {
      contextParts.push(`## About the User`);
      if (name) contextParts.push(`- Name: ${name}`);
      if (localProfile.roles.length > 0) contextParts.push(`- Role: ${localProfile.roles.join(', ')}`);
      if (background) contextParts.push(`- Background: ${background}`);
      if (favoriteColor) contextParts.push(`- Favorite color: ${favoriteColor}`);
      if (workPatterns) contextParts.push(`- Work style: ${workPatterns}`);
    }

    // Add goals from local profile
    if (localProfile.goals.length > 0) {
      contextParts.push(`\n## Goals`);
      for (const goal of localProfile.goals.slice(0, 5)) {
        contextParts.push(`- ${goal}`);
      }
    }

    // Add projects from local profile
    if (localProfile.projects.length > 0) {
      contextParts.push(`\n## Active Projects`);
      for (const project of localProfile.projects.slice(0, 5)) {
        contextParts.push(`- ${project}`);
      }
    }
  }

  // Add user preferences from ManusLive (only if ManusLive available)
  if (manusLiveContext.userProfile?.preferences) {
    const prefs = manusLiveContext.userProfile.preferences;
    if (prefs.favoriteColor || prefs.workStyle.length > 0) {
      contextParts.push(`\n## User Preferences`);
      if (prefs.favoriteColor) contextParts.push(`- Favorite color: ${prefs.favoriteColor}`);
      if (prefs.workStyle.length > 0) {
        contextParts.push(`- Work style: ${prefs.workStyle.slice(0, 3).join('; ')}`);
      }
    }
  }

  // Add memory facts
  if (manusLiveContext.memory?.facts.length) {
    contextParts.push(`\n## Known Facts`);
    for (const fact of manusLiveContext.memory.facts.slice(0, 10)) {
      contextParts.push(`- ${fact}`);
    }
  }

  // Add current focus/goals
  if (manusLiveContext.userProfile?.currentFocus.length || manusLiveContext.memory?.goals.length) {
    contextParts.push(`\n## Current Focus & Goals`);
    const focus = manusLiveContext.userProfile?.currentFocus || [];
    const goals = manusLiveContext.memory?.goals || [];
    for (const item of [...focus.slice(0, 3), ...goals.slice(0, 3)]) {
      contextParts.push(`- ${item}`);
    }
  }

  // Add communication style guidance
  if (manusLiveContext.userProfile?.communicationStyle) {
    const comm = manusLiveContext.userProfile.communicationStyle;
    if (comm.whatWorks.length > 0 || comm.whatDoesntWork.length > 0) {
      contextParts.push(`\n## Communication Style`);
      if (comm.whatWorks.length > 0) {
        contextParts.push(`What works: ${comm.whatWorks.slice(0, 3).join('; ')}`);
      }
      if (comm.whatDoesntWork.length > 0) {
        contextParts.push(`Avoid: ${comm.whatDoesntWork.slice(0, 3).join('; ')}`);
      }
    }
  }

  // Add persistent context from memory
  if (manusLiveContext.memory?.context.length) {
    contextParts.push(`\n## Persistent Context`);
    for (const ctx of manusLiveContext.memory.context.slice(0, 5)) {
      contextParts.push(`- ${ctx}`);
    }
  }

  // Add local Johnny5 profile settings if they differ or add new info
  if (localProfile) {
    if (localProfile.roles.length > 0 || localProfile.projects.length > 0) {
      contextParts.push(`\n## Coder1 IDE Configuration`);
      if (localProfile.roles.length > 0) {
        contextParts.push(`- Roles: ${localProfile.roles.join(', ')}`);
      }
      if (localProfile.projects.length > 0) {
        contextParts.push(`- Active projects: ${localProfile.projects.join(', ')}`);
      }
      contextParts.push(`- Proactivity level: ${localProfile.proactivity_level}`);
    }
  }

  // Fallback if no data available
  if (contextParts.length === 0) {
    contextParts.push('No user context available. Ask the user to introduce themselves.');
  }

  return {
    localProfile,
    manusLiveMemory: manusLiveContext.memory,
    manusLiveUserProfile: manusLiveContext.userProfile,
    manusLiveInstalled: isManusLiveInstalled(),
    contextForAI: contextParts.join('\n'),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Refresh ManusLive memory cache
 *
 * Call this when you know the ManusLive files have been updated
 * (e.g., after a Telegram message updated the memory)
 */
export function refreshManusLiveMemory(): void {
  clearManusLiveCache();
}

/**
 * Check if unified memory is available
 *
 * Returns true if either ManusLive is installed or local profile exists
 */
export async function hasUnifiedMemory(): Promise<boolean> {
  const [localProfile, isInstalled] = await Promise.all([
    getProfile(),
    Promise.resolve(isManusLiveInstalled()),
  ]);

  return localProfile !== null || isInstalled;
}

// ============================================================================
// Export Database Path for External Use
// ============================================================================

export const DATABASE_PATH = DB_PATH;
export const DATABASE_DIR = DB_DIR;
// BACKUP_PATH is already imported and aliased from data-paths, re-export it
export { BACKUP_PATH };

// ============================================================================
// Memory Chunk Operations
// ============================================================================

/**
 * Insert or update a memory chunk
 */
export async function upsertMemoryChunk(chunk: {
  id: string;
  source_type: 'manuslive_memory' | 'manuslive_user' | 'session';
  source_id: string;
  content: string;
  content_hash: string;
  start_line?: number;
  end_line?: number;
  token_count?: number;
  heading?: string;
  section_type?: string;
}): Promise<MemoryChunk> {
  const database = getDb();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO memory_chunks (id, source_type, source_id, content, content_hash, start_line, end_line, token_count, heading, section_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_id, content_hash) DO UPDATE SET
      content = excluded.content,
      start_line = excluded.start_line,
      end_line = excluded.end_line,
      token_count = excluded.token_count,
      heading = excluded.heading,
      section_type = excluded.section_type,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    chunk.id,
    chunk.source_type,
    chunk.source_id,
    chunk.content,
    chunk.content_hash,
    chunk.start_line ?? null,
    chunk.end_line ?? null,
    chunk.token_count ?? 0,
    chunk.heading ?? null,
    chunk.section_type ?? null,
    now,
    now
  );

  return {
    id: chunk.id,
    source_type: chunk.source_type,
    source_id: chunk.source_id,
    content: chunk.content,
    content_hash: chunk.content_hash,
    start_line: chunk.start_line ?? null,
    end_line: chunk.end_line ?? null,
    token_count: chunk.token_count ?? 0,
    heading: chunk.heading,
    section_type: chunk.section_type,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get a memory chunk by ID
 */
export async function getMemoryChunk(id: string): Promise<MemoryChunk | null> {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM memory_chunks WHERE id = ?');
  return stmt.get(id) as MemoryChunk | null;
}

/**
 * Get all chunks for a source
 */
export async function getChunksBySource(sourceType: string, sourceId: string): Promise<MemoryChunk[]> {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM memory_chunks WHERE source_type = ? AND source_id = ?');
  return stmt.all(sourceType, sourceId) as MemoryChunk[];
}

/**
 * Delete chunks by source
 */
export async function deleteChunksBySource(sourceType: string, sourceId: string): Promise<number> {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM memory_chunks WHERE source_type = ? AND source_id = ?');
  const result = stmt.run(sourceType, sourceId);
  return result.changes;
}

/**
 * Delete a specific chunk
 */
export async function deleteMemoryChunk(id: string): Promise<boolean> {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM memory_chunks WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Sanitize query for FTS5
 * Removes special characters that break FTS5 syntax
 */
function sanitizeFTS5Query(query: string): string {
  // Remove FTS5 special characters and punctuation: * " - + ? ( ) : ^ ~ , . ! ; AND OR NOT
  let sanitized = query
    .replace(/[*"()\-+?:^~,.!;']/g, ' ')  // Remove special chars and punctuation
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, ' ')  // Remove operators
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .trim();

  // If empty after sanitization, return original alphanumeric only
  if (!sanitized) {
    sanitized = query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  }

  // Filter to meaningful words (skip common stop words for better search)
  const stopWords = new Set(['i', 'me', 'my', 'we', 'you', 'your', 'the', 'a', 'an', 'is', 'are', 'was', 'be', 'do', 'does', 'did', 'have', 'has', 'had', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'it', 'its', 'this', 'that', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'hello', 'hi', 'hey', 'please', 'thanks', 'thank', 'remember']);
  const words = sanitized.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w.toLowerCase()));

  if (words.length === 0) {
    // If all words were stop words, use original words but with OR
    const allWords = sanitized.split(/\s+/).filter(w => w.length > 1);
    if (allWords.length === 0) return '';
    // FTS5 uses implicit AND - we need explicit OR for broader search
    return allWords.join(' OR ');
  }

  if (words.length === 1) return words[0];

  // FTS5 uses implicit AND by default, so we use explicit OR for broader recall
  return words.join(' OR ');
}

/**
 * Keyword search using FTS5
 */
export async function searchMemoryKeyword(query: string, limit: number = 10): Promise<MemorySearchResult[]> {
  const database = getDb();

  // Sanitize query for FTS5
  const sanitizedQuery = sanitizeFTS5Query(query);
  if (!sanitizedQuery) {
    console.warn('[Johnny5 DB] Empty query after sanitization');
    return [];
  }

  console.log('[Johnny5 DB] FTS5 query:', sanitizedQuery);

  // FTS5 search with BM25 ranking
  const stmt = database.prepare(`
    SELECT
      mc.id as chunk_id,
      mc.content,
      mc.source_type,
      mc.source_id,
      mc.start_line,
      mc.end_line,
      0.0 as vector_score,
      bm25(memory_fts) as keyword_score,
      bm25(memory_fts) as combined_score
    FROM memory_fts
    JOIN memory_chunks mc ON memory_fts.rowid = mc.rowid
    WHERE memory_fts MATCH ?
    ORDER BY bm25(memory_fts)
    LIMIT ?
  `);

  try {
    return stmt.all(sanitizedQuery, limit) as MemorySearchResult[];
  } catch (err) {
    console.error('[Johnny5 DB] FTS search error:', err, 'Query:', sanitizedQuery);
    return [];
  }
}

/**
 * Store embedding for a chunk (if sqlite-vec available)
 */
export async function storeEmbedding(chunkId: string, embedding: number[]): Promise<boolean> {
  if (!sqliteVecLoaded) {
    console.warn('[Johnny5 DB] Vector storage not available');
    return false;
  }

  const database = getDb();
  try {
    const stmt = database.prepare(`
      INSERT OR REPLACE INTO memory_embeddings (chunk_id, embedding)
      VALUES (?, ?)
    `);
    stmt.run(chunkId, JSON.stringify(embedding));
    return true;
  } catch (err) {
    console.error('[Johnny5 DB] Failed to store embedding:', err);
    return false;
  }
}

/**
 * Vector similarity search (if sqlite-vec available)
 */
export async function searchMemoryVector(
  queryEmbedding: number[],
  limit: number = 10
): Promise<MemorySearchResult[]> {
  if (!sqliteVecLoaded) {
    console.warn('[Johnny5 DB] Vector search not available, use keyword search instead');
    return [];
  }

  const database = getDb();
  try {
    const stmt = database.prepare(`
      SELECT
        mc.id as chunk_id,
        mc.content,
        mc.source_type,
        mc.source_id,
        mc.start_line,
        mc.end_line,
        me.distance as vector_score,
        0.0 as keyword_score,
        me.distance as combined_score
      FROM memory_embeddings me
      JOIN memory_chunks mc ON me.chunk_id = mc.id
      WHERE me.embedding MATCH ?
      ORDER BY me.distance
      LIMIT ?
    `);
    return stmt.all(JSON.stringify(queryEmbedding), limit) as MemorySearchResult[];
  } catch (err) {
    console.error('[Johnny5 DB] Vector search error:', err);
    return [];
  }
}

/**
 * Get memory stats
 */
export async function getMemoryStats(): Promise<MemoryStats> {
  const database = getDb();

  const totalStmt = database.prepare('SELECT COUNT(*) as count FROM memory_chunks');
  const total = (totalStmt.get() as { count: number }).count;

  const manusStmt = database.prepare("SELECT COUNT(*) as count FROM memory_chunks WHERE source_type LIKE 'manuslive%'");
  const manuslive = (manusStmt.get() as { count: number }).count;

  const sessionStmt = database.prepare("SELECT COUNT(*) as count FROM memory_chunks WHERE source_type = 'session'");
  const sessions = (sessionStmt.get() as { count: number }).count;

  const lastStmt = database.prepare('SELECT MAX(updated_at) as last FROM memory_chunks');
  const last = (lastStmt.get() as { last: string | null }).last;

  const modelStmt = database.prepare('SELECT model_name FROM embedding_metadata WHERE id = ?');
  const model = modelStmt.get('current') as { model_name: string } | undefined;

  return {
    total_chunks: total,
    manuslive_chunks: manuslive,
    session_chunks: sessions,
    last_indexed: last,
    embedding_model: model?.model_name ?? null,
  };
}

/**
 * Set the current embedding model metadata
 */
export async function setEmbeddingMetadata(
  modelName: string,
  modelVersion: string,
  dimensions: number
): Promise<void> {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO embedding_metadata (id, model_name, model_version, dimensions, created_at)
    VALUES ('current', ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(modelName, modelVersion, dimensions);
}

/**
 * Get current embedding metadata
 */
export async function getEmbeddingMetadata(): Promise<EmbeddingMetadata | null> {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM embedding_metadata WHERE id = ?');
  return stmt.get('current') as EmbeddingMetadata | null;
}

/**
 * Clear all memory chunks (for reindexing)
 */
export async function clearAllMemoryChunks(): Promise<number> {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM memory_chunks');
  const result = stmt.run();

  // Also clear embeddings if available
  if (sqliteVecLoaded) {
    try {
      database.exec('DELETE FROM memory_embeddings');
    } catch (err) {
      console.warn('[Johnny5 DB] Failed to clear embeddings:', err);
    }
  }

  return result.changes;
}

// Re-export ManusLive types for convenience
export type { ManusLiveMemory, ManusLiveUserProfile, UnifiedMemoryContext };
export { getManusLiveMemory, getManusLiveUserProfile, isManusLiveInstalled };
