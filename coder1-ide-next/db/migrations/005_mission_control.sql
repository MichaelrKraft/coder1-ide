-- War Room meeting transcripts (append-only per turn)
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
);
CREATE INDEX IF NOT EXISTS idx_warroom_transcript_meeting
  ON agent_hub_warroom_transcript(meeting_id, created_at);

-- Append-only audit log for agent actions
CREATE TABLE IF NOT EXISTS agent_hub_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target TEXT,
  payload_json TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
  ON agent_hub_audit_log(user_id, created_at DESC);
