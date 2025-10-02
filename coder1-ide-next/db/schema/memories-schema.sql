-- Coder1 IDE Memory System Database Schema
-- Phase II: Persistence Layer
-- Created: October 2024
-- Database: SQLite

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================
-- Core Tables
-- ============================================

-- Main memories table
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN (
    'bug-fix', 
    'feature-completion', 
    'breakthrough', 
    'learning', 
    'architecture-decision', 
    'solution-discovery'
  )),
  confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  tags TEXT, -- JSON array of tags
  context TEXT, -- JSON object with files, commands, errors, breakthroughs
  checkpoint_id TEXT, -- Reference to checkpoint if created during one
  session_id TEXT, -- Reference to session that created it
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME, -- Soft delete support
  
  -- Additional metadata
  auto_generated BOOLEAN DEFAULT FALSE,
  template_type TEXT DEFAULT 'default',
  starred BOOLEAN DEFAULT FALSE
);

-- Memory events tracking (detailed event history)
CREATE TABLE IF NOT EXISTS memory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT, -- JSON object with event-specific data
  confidence REAL DEFAULT 0.5,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Files associated with this event
  files TEXT, -- JSON array of file paths
  
  -- Commands that triggered this event
  commands TEXT, -- JSON array of commands
  
  -- Error messages if applicable
  errors TEXT, -- JSON array of error messages
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Memory attachments (code snippets, screenshots, etc.)
CREATE TABLE IF NOT EXISTS memory_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN (
    'code-snippet',
    'screenshot',
    'terminal-output',
    'diff',
    'markdown',
    'link'
  )),
  content TEXT, -- The actual content or path to file
  metadata TEXT, -- JSON object with additional info
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Memory relationships (linking related memories)
CREATE TABLE IF NOT EXISTS memory_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_memory_id INTEGER NOT NULL,
  target_memory_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'related-to',
    'follows-from',
    'resolves',
    'causes',
    'implements',
    'references'
  )),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (source_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (target_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  
  -- Ensure no duplicate relationships
  UNIQUE(source_memory_id, target_memory_id, relationship_type)
);

-- Memory versions (for tracking edits)
CREATE TABLE IF NOT EXISTS memory_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  tags TEXT,
  context TEXT,
  changed_by TEXT, -- User or system that made the change
  change_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  UNIQUE(memory_id, version_number)
);

-- User preferences (storing user settings)
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Memory statistics (aggregated data for performance)
CREATE TABLE IF NOT EXISTS memory_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,
  total_memories INTEGER DEFAULT 0,
  bug_fixes INTEGER DEFAULT 0,
  features INTEGER DEFAULT 0,
  breakthroughs INTEGER DEFAULT 0,
  learning INTEGER DEFAULT 0,
  architecture_decisions INTEGER DEFAULT 0,
  solution_discoveries INTEGER DEFAULT 0,
  auto_generated INTEGER DEFAULT 0,
  manually_created INTEGER DEFAULT 0,
  average_confidence REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Memory search index (for full-text search)
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  title,
  description,
  tags,
  content=memories,
  content_rowid=id,
  tokenize='porter unicode61'
);

-- ============================================
-- Indexes for Core Tables
-- ============================================

-- Indexes for memories table
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_checkpoint ON memories(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_deleted ON memories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_memories_starred ON memories(starred);

-- Indexes for memory_events table
CREATE INDEX IF NOT EXISTS idx_memory_events_memory ON memory_events(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_type ON memory_events(event_type);

-- Indexes for memory_attachments table
CREATE INDEX IF NOT EXISTS idx_memory_attachments_memory ON memory_attachments(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_attachments_type ON memory_attachments(attachment_type);

-- Indexes for memory_relationships table
CREATE INDEX IF NOT EXISTS idx_memory_relationships_source ON memory_relationships(source_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_target ON memory_relationships(target_memory_id);

-- Indexes for memory_versions table
CREATE INDEX IF NOT EXISTS idx_memory_versions_memory ON memory_versions(memory_id);

-- Indexes for memory_statistics table
CREATE INDEX IF NOT EXISTS idx_memory_statistics_date ON memory_statistics(date);

-- ============================================
-- Triggers
-- ============================================

-- Update timestamp on memories table
CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
  AFTER UPDATE ON memories
  FOR EACH ROW
BEGIN
  UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create version history on memory update
CREATE TRIGGER IF NOT EXISTS create_memory_version
  AFTER UPDATE OF title, description, tags, context ON memories
  FOR EACH ROW
  WHEN OLD.title != NEW.title 
    OR OLD.description != NEW.description 
    OR OLD.tags != NEW.tags 
    OR OLD.context != NEW.context
BEGIN
  INSERT INTO memory_versions (
    memory_id, 
    version_number, 
    title, 
    description, 
    tags, 
    context,
    changed_by,
    change_reason
  )
  SELECT 
    NEW.id,
    COALESCE((SELECT MAX(version_number) FROM memory_versions WHERE memory_id = NEW.id), 0) + 1,
    OLD.title,
    OLD.description,
    OLD.tags,
    OLD.context,
    'system',
    'Automatic version on update';
END;

-- Update statistics on memory insert
CREATE TRIGGER IF NOT EXISTS update_statistics_on_insert
  AFTER INSERT ON memories
  FOR EACH ROW
BEGIN
  INSERT INTO memory_statistics (date, total_memories)
  VALUES (DATE(NEW.created_at), 1)
  ON CONFLICT(date) DO UPDATE SET
    total_memories = total_memories + 1,
    bug_fixes = bug_fixes + (CASE WHEN NEW.type = 'bug-fix' THEN 1 ELSE 0 END),
    features = features + (CASE WHEN NEW.type = 'feature-completion' THEN 1 ELSE 0 END),
    breakthroughs = breakthroughs + (CASE WHEN NEW.type = 'breakthrough' THEN 1 ELSE 0 END),
    learning = learning + (CASE WHEN NEW.type = 'learning' THEN 1 ELSE 0 END),
    architecture_decisions = architecture_decisions + (CASE WHEN NEW.type = 'architecture-decision' THEN 1 ELSE 0 END),
    solution_discoveries = solution_discoveries + (CASE WHEN NEW.type = 'solution-discovery' THEN 1 ELSE 0 END),
    auto_generated = auto_generated + (CASE WHEN NEW.auto_generated THEN 1 ELSE 0 END),
    manually_created = manually_created + (CASE WHEN NOT NEW.auto_generated THEN 1 ELSE 0 END),
    updated_at = CURRENT_TIMESTAMP;
END;

-- Update FTS index on memory changes
CREATE TRIGGER IF NOT EXISTS update_memories_fts_insert
  AFTER INSERT ON memories
BEGIN
  INSERT INTO memories_fts(rowid, title, description, tags)
  VALUES (NEW.id, NEW.title, NEW.description, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS update_memories_fts_delete
  AFTER DELETE ON memories
BEGIN
  DELETE FROM memories_fts WHERE rowid = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_memories_fts_update
  AFTER UPDATE ON memories
BEGIN
  UPDATE memories_fts 
  SET title = NEW.title, 
      description = NEW.description, 
      tags = NEW.tags
  WHERE rowid = NEW.id;
END;

-- ============================================
-- Views for Common Queries
-- ============================================

-- Active memories (not deleted)
CREATE VIEW IF NOT EXISTS active_memories AS
SELECT * FROM memories 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC;

-- Recent memories (last 30 days)
CREATE VIEW IF NOT EXISTS recent_memories AS
SELECT * FROM memories 
WHERE deleted_at IS NULL 
  AND created_at >= datetime('now', '-30 days')
ORDER BY created_at DESC;

-- High confidence memories
CREATE VIEW IF NOT EXISTS high_confidence_memories AS
SELECT * FROM memories 
WHERE deleted_at IS NULL 
  AND confidence >= 0.7
ORDER BY confidence DESC, created_at DESC;

-- Memory summary by type
CREATE VIEW IF NOT EXISTS memory_summary_by_type AS
SELECT 
  type,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  MAX(created_at) as latest
FROM memories
WHERE deleted_at IS NULL
GROUP BY type;

-- Memory timeline view
CREATE VIEW IF NOT EXISTS memory_timeline AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as memory_count,
  GROUP_CONCAT(DISTINCT type) as types,
  AVG(confidence) as avg_confidence
FROM memories
WHERE deleted_at IS NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- Initial Data
-- ============================================

-- Insert default user preferences
INSERT OR IGNORE INTO user_preferences (key, value) VALUES
  ('memory_detection_enabled', 'true'),
  ('memory_detection_threshold', '70'),
  ('memory_auto_generation', 'true'),
  ('memory_notifications', 'true'),
  ('memory_notification_sound', 'false'),
  ('memory_template_type', 'default'),
  ('memory_event_types', '{"bugFix":true,"featureCompletion":true,"breakthrough":true,"learning":true,"architectureDecision":false,"solutionDiscovery":false}');

-- ============================================
-- Indexes for Performance
-- ============================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memories_type_confidence 
  ON memories(type, confidence) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_session_created 
  ON memories(session_id, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_starred_created 
  ON memories(starred, created_at DESC) 
  WHERE deleted_at IS NULL AND starred = TRUE;

-- ============================================
-- Utility Functions (as SQL comments for reference)
-- ============================================

-- To get memories with their events:
-- SELECT m.*, GROUP_CONCAT(me.event_type) as events
-- FROM memories m
-- LEFT JOIN memory_events me ON m.id = me.memory_id
-- WHERE m.deleted_at IS NULL
-- GROUP BY m.id;

-- To get related memories:
-- SELECT m2.* 
-- FROM memories m1
-- JOIN memory_relationships mr ON m1.id = mr.source_memory_id
-- JOIN memories m2 ON mr.target_memory_id = m2.id
-- WHERE m1.id = ? AND m2.deleted_at IS NULL;

-- To search memories:
-- SELECT m.* 
-- FROM memories m
-- JOIN memories_fts fts ON m.id = fts.rowid
-- WHERE memories_fts MATCH ? 
--   AND m.deleted_at IS NULL
-- ORDER BY rank;