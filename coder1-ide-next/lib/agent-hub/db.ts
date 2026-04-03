import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getAgentHubDatabase(): Database.Database {
  if (!db) {
    const dataDir =
      process.env.NODE_ENV === 'production'
        ? '/data'
        : path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'agent-hub.db');

    fs.mkdirSync(dataDir, { recursive: true });

    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });

    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA busy_timeout = 5000');

    initializeSchema(db);
  }

  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      skills TEXT NOT NULL DEFAULT '[]',
      workspace_path TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
      monthly_budget_cents INTEGER NOT NULL DEFAULT 0,
      max_concurrent_runs INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'idle',
      last_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      supervisor_agent_id TEXT
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      parent_task_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      github_issue_url TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'backlog',
      estimated_cost_cents INTEGER,
      actual_cost_cents INTEGER NOT NULL DEFAULT 0,
      run_ids TEXT NOT NULL DEFAULT '[]',
      modified_files TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      schedule_type TEXT,
      schedule_time TEXT,
      schedule_day INTEGER,
      schedule_enabled INTEGER NOT NULL DEFAULT 0,
      next_run_at TEXT
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      session_id TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents INTEGER NOT NULL DEFAULT 0,
      exit_code INTEGER,
      git_diff TEXT,
      approval_status TEXT,
      approved_by TEXT,
      error_summary TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      worktree_path TEXT
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_run_log_chunks (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      log_type TEXT NOT NULL DEFAULT 'stdout',
      created_at TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      due_date TEXT,
      task_ids TEXT NOT NULL DEFAULT '[]',
      progress_percent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}
