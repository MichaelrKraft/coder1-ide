-- Task Queue schema for Johnny5
-- Stores queued tasks that auto-load when current task completes

CREATE TABLE IF NOT EXISTS task_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_text TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT 0,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME
);

-- Index for efficient ordering: urgent first, then by priority, then FIFO
CREATE INDEX IF NOT EXISTS idx_task_queue_order
  ON task_queue(status, is_urgent DESC, priority DESC, created_at ASC);
