-- Team Knowledge Sync schema
-- Teams, members, invitations, and sync logging

-- teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  team_id TEXT NOT NULL,
  email TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'expired')),
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- team_sync_log table
CREATE TABLE IF NOT EXISTS team_sync_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  team_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('push', 'pull')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced_by TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_sync_log_team ON team_sync_log(team_id);
CREATE INDEX IF NOT EXISTS idx_team_sync_log_synced ON team_sync_log(synced_at);
