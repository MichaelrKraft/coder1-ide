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

    db = new Database(dbPath);

    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA busy_timeout = 5000');

    initializeSchema(db);
    migrateSchema(db);
  }

  return db;
}

export interface CronTask {
  id: string;
  userId: string;
  agentId: string;
  runId: string;
  schedule: string;
  prompt: string;
  status: 'active' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string | null;
  nextRunAt: string | null;
}

export function insertCronTask(task: Omit<CronTask, 'status' | 'createdAt' | 'nextRunAt'>): void {
  const database = getAgentHubDatabase();
  database.prepare(
    `INSERT INTO agent_hub_cron_tasks (id, user_id, agent_id, run_id, schedule, prompt, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(task.id, task.userId, task.agentId, task.runId, task.schedule, task.prompt, task.expiresAt ?? null);
}

export function listCronTasks(agentId: string, userId: string): CronTask[] {
  const database = getAgentHubDatabase();
  const rows = database.prepare(
    `SELECT * FROM agent_hub_cron_tasks WHERE agent_id = ? AND user_id = ? ORDER BY created_at DESC`
  ).all(agentId, userId) as Array<{
    id: string; user_id: string; agent_id: string; run_id: string;
    schedule: string; prompt: string; status: string;
    created_at: string; expires_at: string | null; next_run_at: string | null;
  }>;
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    agentId: r.agent_id,
    runId: r.run_id,
    schedule: r.schedule,
    prompt: r.prompt,
    status: r.status as CronTask['status'],
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    nextRunAt: r.next_run_at,
  }));
}

export function cancelCronTask(taskId: string, userId: string): void {
  const database = getAgentHubDatabase();
  database.prepare(
    `UPDATE agent_hub_cron_tasks SET status = 'cancelled' WHERE id = ? AND user_id = ?`
  ).run(taskId, userId);
}

export function getDueScheduledTasks(now: string): CronTask[] {
  const database = getAgentHubDatabase();
  const rows = database.prepare(
    `SELECT * FROM agent_hub_cron_tasks
     WHERE status = 'active' AND next_run_at IS NOT NULL AND next_run_at <= ?`
  ).all(now) as Array<{
    id: string; user_id: string; agent_id: string; run_id: string;
    schedule: string; prompt: string; status: string;
    created_at: string; expires_at: string | null; next_run_at: string | null;
  }>;
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    agentId: r.agent_id,
    runId: r.run_id,
    schedule: r.schedule,
    prompt: r.prompt,
    status: r.status as CronTask['status'],
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    nextRunAt: r.next_run_at,
  }));
}

export function updateCronTaskNextRun(id: string, nextRunAt: string | null): void {
  const database = getAgentHubDatabase();
  database.prepare(
    `UPDATE agent_hub_cron_tasks SET next_run_at = ? WHERE id = ?`
  ).run(nextRunAt, id);
}

export function expireOldCronTasks(): void {
  const database = getAgentHubDatabase();
  // Mark tasks older than 3 days as expired if still active
  database.prepare(
    `UPDATE agent_hub_cron_tasks
     SET status = 'expired'
     WHERE status = 'active'
       AND (expires_at IS NOT NULL AND expires_at < datetime('now')
            OR created_at < datetime('now', '-3 days'))`
  ).run();
}

function migrateSchema(database: Database.Database): void {
  const addColumnIfMissing = (table: string, column: string, definition: string) => {
    try {
      const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      if (!cols.some(c => c.name === column)) {
        database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    } catch { /* table may not exist */ }
  };
  addColumnIfMissing('agent_hub_agents', 'supervisor_agent_id', 'TEXT');
  addColumnIfMissing('agent_hub_agents', 'project_id', 'TEXT');
  addColumnIfMissing('agent_hub_agents', 'telegram_bot_token', 'TEXT');
  addColumnIfMissing('agent_hub_agents', 'telegram_chat_id', 'TEXT');
  addColumnIfMissing('agent_hub_agents', 'mcp_servers', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('agent_hub_tasks', 'schedule_type', 'TEXT');
  addColumnIfMissing('agent_hub_tasks', 'schedule_time', 'TEXT');
  addColumnIfMissing('agent_hub_tasks', 'schedule_day', 'INTEGER');
  addColumnIfMissing('agent_hub_tasks', 'schedule_enabled', 'INTEGER DEFAULT 0');
  addColumnIfMissing('agent_hub_tasks', 'next_run_at', 'TEXT');
  addColumnIfMissing('agent_hub_tasks', 'issue_number', 'INTEGER');
  addColumnIfMissing('agent_hub_tasks', 'labels', "TEXT DEFAULT '[]'");
  addColumnIfMissing('agent_hub_tasks', 'project_id', 'TEXT');
  addColumnIfMissing('agent_hub_runs', 'worktree_path', 'TEXT');
  addColumnIfMissing('agent_hub_goals', 'turn', "TEXT DEFAULT 'user'");
  addColumnIfMissing('agent_hub_memory', 'scope', "TEXT NOT NULL DEFAULT 'agent'");
  addColumnIfMissing('agent_hub_memory', 'project_id', 'TEXT');
  addColumnIfMissing('agent_hub_runs', 'human_input_request', 'TEXT');
  addColumnIfMissing('agent_hub_runs', 'human_input_response', 'TEXT');
  addColumnIfMissing('agent_hub_chat_messages', 'teaching_session_id', 'TEXT');
  addColumnIfMissing('agent_hub_agents', 'last_session_id', 'TEXT');
  addColumnIfMissing('agent_hub_memory', 'importance', 'REAL DEFAULT 0.5');
  addColumnIfMissing('agent_hub_memory', 'memory_type', "TEXT DEFAULT 'context'");
  addColumnIfMissing('agent_hub_memory', 'salience', 'REAL DEFAULT 1.0');
  addColumnIfMissing('agent_hub_memory', 'expires_at', 'DATETIME');
  addColumnIfMissing('agent_hub_memory', 'access_count', 'INTEGER DEFAULT 0');
  addColumnIfMissing('agent_hub_hive_mind', 'event_type', "TEXT DEFAULT 'task_complete'");
  addColumnIfMissing('agent_hub_hive_mind', 'details_json', 'TEXT');
  addColumnIfMissing('agent_hub_cron_tasks', 'next_run_at', 'TEXT');
  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_teaching_session_id ON agent_hub_chat_messages(teaching_session_id)`);
    database.exec(`CREATE INDEX IF NOT EXISTS idx_teaching_sessions_agent_user ON agent_hub_teaching_sessions(agent_id, user_id)`);
  } catch { /* indexes may already exist */ }
}

export interface HiveMindEntry {
  id: string;
  userId: string;
  agentId: string;
  agentRole: string;
  actionType: string;
  taskTitle: string;
  summary: string;
  outcome: 'success' | 'failed' | 'partial';
  filesModified: string | null;
  branch: string | null;
  runId: string | null;
  createdAt: string;
}

export function getRecentHiveMindEntries(userId: string, limit = 10): HiveMindEntry[] {
  const db = getAgentHubDatabase();
  const rows = db.prepare(
    `SELECT * FROM agent_hub_hive_mind WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  ).all(userId, limit) as Array<{
    id: string; user_id: string; agent_id: string; agent_role: string;
    action_type: string; task_title: string; summary: string; outcome: string;
    files_modified: string | null; branch: string | null; run_id: string | null;
    created_at: string;
  }>;
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    agentId: r.agent_id,
    agentRole: r.agent_role,
    actionType: r.action_type,
    taskTitle: r.task_title,
    summary: r.summary,
    outcome: r.outcome as HiveMindEntry['outcome'],
    filesModified: r.files_modified,
    branch: r.branch,
    runId: r.run_id,
    createdAt: r.created_at,
  }));
}

export function insertWarroomTranscript(entry: {
  id: string;
  meetingId: string;
  turnId: string;
  agentId: string;
  userId: string;
  messageText: string;
  role: 'user' | 'assistant';
  sourceTurnId?: string | null;
}): void {
  const database = getAgentHubDatabase();
  database.prepare(
    `INSERT OR IGNORE INTO agent_hub_warroom_transcript
     (id, meeting_id, turn_id, agent_id, user_id, message_text, role, source_turn_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.id, entry.meetingId, entry.turnId, entry.agentId,
    entry.userId, entry.messageText, entry.role, entry.sourceTurnId ?? null
  );
}

export function listWarroomTranscript(meetingId: string, userId: string, since?: string): Array<{
  id: string; meetingId: string; turnId: string; agentId: string;
  userId: string; messageText: string; role: string; createdAt: string;
}> {
  const database = getAgentHubDatabase();
  const query = since
    ? `SELECT * FROM agent_hub_warroom_transcript WHERE meeting_id = ? AND user_id = ? AND created_at > ? ORDER BY created_at ASC`
    : `SELECT * FROM agent_hub_warroom_transcript WHERE meeting_id = ? AND user_id = ? ORDER BY created_at ASC`;
  const params = since ? [meetingId, userId, since] : [meetingId, userId];
  const rows = database.prepare(query).all(...params) as Array<{
    id: string; meeting_id: string; turn_id: string; agent_id: string;
    user_id: string; message_text: string; role: string; created_at: string;
  }>;
  return rows.map(r => ({
    id: r.id, meetingId: r.meeting_id, turnId: r.turn_id,
    agentId: r.agent_id, userId: r.user_id, messageText: r.message_text,
    role: r.role, createdAt: r.created_at,
  }));
}

function initPurTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_sources (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('reddit','x','hn','youtube','blog','email')),
      handle TEXT NOT NULL,
      url TEXT,
      weight REAL DEFAULT 1.0,
      active INTEGER DEFAULT 1,
      added_at INTEGER NOT NULL,
      last_scraped_at INTEGER,
      error_count INTEGER DEFAULT 0,
      UNIQUE(kind, handle)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_finds (
      id TEXT PRIMARY KEY,
      source_id TEXT REFERENCES pur_sources(id),
      external_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      author TEXT,
      content_hash TEXT NOT NULL,
      raw_json TEXT,
      snippet TEXT,
      engagement_score REAL DEFAULT 0,
      published_at INTEGER,
      scraped_at INTEGER NOT NULL,
      dedup_group_id TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','deleted','excluded')),
      UNIQUE(source_id, external_id)
    )
  `);

  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_pur_finds_dedup ON pur_finds(dedup_group_id)`);
    database.exec(`CREATE INDEX IF NOT EXISTS idx_pur_finds_published ON pur_finds(published_at DESC)`);
    database.exec(`CREATE INDEX IF NOT EXISTS idx_pur_finds_scraped ON pur_finds(scraped_at DESC)`);
  } catch { /* indexes may already exist */ }

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_curated (
      id TEXT PRIMARY KEY,
      week_iso TEXT NOT NULL,
      find_id TEXT REFERENCES pur_finds(id),
      rank INTEGER,
      category TEXT CHECK(category IN ('workflow','power_tool','thread','video','spotlight')),
      justification TEXT,
      mike_approved INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(week_iso, find_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_newsletters (
      id TEXT PRIMARY KEY,
      week_iso TEXT UNIQUE NOT NULL,
      draft_path TEXT,
      substack_url TEXT,
      subject TEXT,
      mike_essay TEXT,
      body_md TEXT,
      sent_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_members (
      id TEXT PRIMARY KEY,
      discord_id TEXT UNIQUE NOT NULL,
      discord_username TEXT,
      verified_at INTEGER,
      sessions_count INTEGER,
      screenshot_hash TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected','revoked','left')),
      verification_attempts INTEGER DEFAULT 0,
      last_attempt_at INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_verifications (
      id TEXT PRIMARY KEY,
      member_id TEXT REFERENCES pur_members(id),
      screenshot_path TEXT,
      vision_output_json TEXT,
      decision TEXT CHECK(decision IN ('auto_approve','auto_reject','manual_flag','mike_approve','mike_reject')),
      reviewer TEXT,
      reviewed_at INTEGER,
      reason TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_metrics (
      week_iso TEXT PRIMARY KEY,
      subscribers INTEGER,
      net_new INTEGER,
      discord_total INTEGER,
      verified_count INTEGER,
      coder1_conversions INTEGER,
      newsletter_open_rate REAL,
      recorded_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_audit_log (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      payload_json TEXT,
      at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_candidate_sources (
      id TEXT PRIMARY KEY,
      kind TEXT,
      handle TEXT,
      reason TEXT,
      found_at INTEGER,
      reviewed INTEGER DEFAULT 0,
      UNIQUE(kind, handle)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS pur_member_dm_sent (
      id TEXT PRIMARY KEY,
      member_id TEXT REFERENCES pur_members(id),
      dm_day INTEGER NOT NULL CHECK(dm_day IN (0,1,3,7)),
      sent_at INTEGER NOT NULL,
      UNIQUE(member_id, dm_day)
    )
  `);

  // Seed initial sources
  database.exec(`
    INSERT OR IGNORE INTO pur_sources (id, kind, handle, url, weight, active, added_at) VALUES
      ('src_reddit_claudecode', 'reddit', 'r/ClaudeCode', 'https://reddit.com/r/ClaudeCode.json', 1.2, 1, unixepoch('now') * 1000),
      ('src_reddit_claudeai', 'reddit', 'r/ClaudeAI', 'https://reddit.com/r/ClaudeAI.json', 1.0, 1, unixepoch('now') * 1000),
      ('src_hn', 'hn', 'HackerNews', 'https://hn.algolia.com/api/v1/search', 1.0, 1, unixepoch('now') * 1000),
      ('src_newsletter_tldr', 'email', 'TLDR AI', NULL, 1.3, 1, unixepoch('now') * 1000),
      ('src_newsletter_bens', 'email', 'Ben''s Bites', NULL, 1.2, 1, unixepoch('now') * 1000),
      ('src_newsletter_rundown', 'email', 'The Rundown AI', NULL, 1.1, 1, unixepoch('now') * 1000),
      ('src_newsletter_latent', 'email', 'Latent Space', NULL, 1.2, 1, unixepoch('now') * 1000)
  `);
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
      supervisor_agent_id TEXT,
      project_id TEXT,
      telegram_bot_token TEXT,
      telegram_chat_id TEXT
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#00d9ff',
      workspace_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      next_run_at TEXT,
      issue_number INTEGER,
      labels TEXT NOT NULL DEFAULT '[]',
      project_id TEXT
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
    CREATE TABLE IF NOT EXISTS agent_hub_run_thoughts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      label TEXT NOT NULL,
      tool TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_run_thoughts_run_id
    ON agent_hub_run_thoughts(run_id)
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_chat_messages (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      session_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
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

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_hive_mind (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_role TEXT NOT NULL,
      action_type TEXT NOT NULL DEFAULT 'task_complete',
      task_title TEXT NOT NULL,
      summary TEXT NOT NULL,
      outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failed', 'partial')),
      files_modified TEXT,
      branch TEXT,
      run_id TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_hive_mind_user ON agent_hub_hive_mind(user_id, created_at DESC)`);
  } catch { /* index may already exist */ }

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_memory (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      run_id TEXT,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Self-managed FTS5 table (no content= clause to avoid trigger complexity)
  try {
    database.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS agent_hub_memory_fts USING fts5(
        id UNINDEXED, summary
      )
    `);
  } catch {
    // FTS5 may not be available in all SQLite builds
    console.warn('[agent-hub] FTS5 not available — memory search will use fallback');
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_cron_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      schedule TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT (datetime('now')),
      expires_at DATETIME
    )
  `);

  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_cron_tasks_agent ON agent_hub_cron_tasks(agent_id, status)`);
  } catch { /* index may already exist */ }

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_teaching_sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      title TEXT,
      skill_name TEXT,
      skill_version INTEGER NOT NULL DEFAULT 1,
      chat_snapshot TEXT NOT NULL DEFAULT '[]',
      generated_skill_md TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      paused_at TEXT,
      completed_at TEXT,
      converted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_warroom_transcript (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      turn_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message_text TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      source TEXT NOT NULL DEFAULT 'warroom-text',
      source_turn_id TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE (source, source_turn_id, agent_id)
    )
  `);

  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_warroom_transcript_meeting ON agent_hub_warroom_transcript(meeting_id, created_at)`);
  } catch { /* index may already exist */ }

  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      target TEXT,
      payload_json TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON agent_hub_audit_log(user_id, created_at DESC)`);
  } catch { /* index may already exist */ }

  initPurTables(database);
}
