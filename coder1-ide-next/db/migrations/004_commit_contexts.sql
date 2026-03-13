CREATE TABLE IF NOT EXISTS commit_contexts (
  id TEXT PRIMARY KEY,
  commit_sha TEXT NOT NULL UNIQUE,
  parent_sha TEXT,
  branch TEXT NOT NULL,
  commit_message TEXT,
  commit_author TEXT,
  commit_timestamp TEXT,
  repo_path TEXT,
  session_id TEXT,
  checkpoint_id TEXT,
  session_summary TEXT,
  summary_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (summary_status IN ('pending','generating','done','failed','no_session')),
  files_changed TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commit_contexts_sha ON commit_contexts(commit_sha);
CREATE INDEX IF NOT EXISTS idx_commit_contexts_status ON commit_contexts(summary_status);
CREATE INDEX IF NOT EXISTS idx_commit_contexts_branch ON commit_contexts(branch);
