-- Time Capsules Schema for Coder1 IDE
-- Links AI coding sessions (Claude Code / Johnny5) to Git commits
-- Provides permanent, auditable context for every AI-driven code change

CREATE TABLE IF NOT EXISTS time_capsules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,                           -- nullable for non-authenticated users
  team_id TEXT,                           -- nullable for personal capsules
  repository_path TEXT NOT NULL,          -- local repo path on user's machine
  commit_sha TEXT NOT NULL,               -- the git commit this capsule is linked to
  commit_message TEXT,                    -- commit message for quick reference
  commit_branch TEXT,                     -- branch name at time of commit
  agent_name TEXT NOT NULL DEFAULT 'Claude Code',  -- e.g., 'Claude Code', 'Johnny5'
  agent_version TEXT,                     -- e.g., 'Opus 4.6'
  session_start_time DATETIME,           -- when the AI session began
  duration_seconds INTEGER,              -- session duration in seconds
  transcript TEXT,                        -- JSON string of session transcript (max 1MB)
  files_read TEXT,                        -- JSON array of files read during session
  files_written TEXT,                     -- JSON array of files written/modified
  capsule_git_path TEXT,                  -- path in metadata branch (null if git write failed)
  trigger_type TEXT DEFAULT 'manual_session', -- e.g., 'manual_session', 'github_issue'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repository_path, commit_sha)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tc_user ON time_capsules(user_id);
CREATE INDEX IF NOT EXISTS idx_tc_team ON time_capsules(team_id);
CREATE INDEX IF NOT EXISTS idx_tc_commit ON time_capsules(commit_sha);
CREATE INDEX IF NOT EXISTS idx_tc_repo ON time_capsules(repository_path);
CREATE INDEX IF NOT EXISTS idx_tc_created ON time_capsules(created_at);
