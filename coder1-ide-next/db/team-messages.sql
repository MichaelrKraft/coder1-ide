-- Team Messages table for persistent team chat
-- team_id is TEXT (not UUID FK) matching the pattern of team_knowledge table

CREATE TABLE IF NOT EXISTS team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tm_team_created ON team_messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tm_team_active ON team_messages(team_id, is_active);
