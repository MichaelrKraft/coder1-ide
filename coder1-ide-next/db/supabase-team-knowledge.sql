-- Supabase Cloud Schema for Team Knowledge Sync
-- Run this in Supabase SQL Editor (not locally)
-- This file is for reference/documentation only

CREATE TABLE team_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  data JSONB NOT NULL,
  contributed_by TEXT NOT NULL,
  contributed_by_name TEXT,
  contributor_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  deactivated_by TEXT,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, source_table, content_hash)
);

CREATE INDEX idx_tk_team ON team_knowledge(team_id);
CREATE INDEX idx_tk_updated ON team_knowledge(updated_at);
CREATE INDEX idx_tk_hash ON team_knowledge(team_id, content_hash);
CREATE INDEX idx_tk_active ON team_knowledge(team_id, is_active);

-- Enable Realtime for instant sync notifications
ALTER PUBLICATION supabase_realtime ADD TABLE team_knowledge;
