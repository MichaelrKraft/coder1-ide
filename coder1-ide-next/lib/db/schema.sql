-- Memory Detection System Database Schema
-- Phase II Implementation

-- Main memories table
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('bug-fix', 'feature', 'breakthrough', 'refactor', 'optimization', 'learning', 'milestone')),
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  tags TEXT, -- JSON array of tags
  context TEXT, -- JSON object with files, commands, errors, breakthroughs
  checkpoint_id TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME -- Soft delete support
);

-- Memory events table for tracking detailed events
CREATE TABLE IF NOT EXISTS memory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT, -- JSON object with event-specific data
  confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_checkpoint_id ON memories(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_memories_session_id ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_deleted_at ON memories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_memory_events_memory_id ON memory_events(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_type ON memory_events(event_type);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
AFTER UPDATE ON memories
BEGIN
  UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_preferences_timestamp 
AFTER UPDATE ON user_preferences
BEGIN
  UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- Default preferences
INSERT OR IGNORE INTO user_preferences (key, value) VALUES
  ('detection_threshold', '0.7'),
  ('auto_generation_enabled', 'true'),
  ('event_types_enabled', '["bug-fix","feature","breakthrough","refactor","optimization","learning","milestone"]'),
  ('notification_enabled', 'true'),
  ('export_format', 'markdown');
