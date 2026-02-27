-- Team Assets: shared table for all team-scoped collaboration assets
CREATE TABLE IF NOT EXISTS team_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'slash_command', 'claude_md_version', 'agent_template', 'onboarding_progress'
  )),
  asset_key TEXT NOT NULL,
  data JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_by_name TEXT,
  updated_by TEXT,
  updated_by_name TEXT,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE,
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, asset_type, asset_key)
);

CREATE INDEX IF NOT EXISTS idx_ta_team_type ON team_assets(team_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_ta_updated ON team_assets(updated_at);

-- Enable realtime for this table (run in Supabase dashboard)
-- ALTER PUBLICATION supabase_realtime ADD TABLE team_assets;
