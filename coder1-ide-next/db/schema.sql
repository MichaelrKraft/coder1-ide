-- Context Folders Database Schema
-- SQLite database for automatic session memory and conversation tracking

-- Context Folders - Project-specific memory containers
CREATE TABLE IF NOT EXISTS context_folders (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    auto_created BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_conversations INTEGER DEFAULT 0,
    total_patterns INTEGER DEFAULT 0
);

-- Context Sessions - Individual coding sessions within a folder
CREATE TABLE IF NOT EXISTS context_sessions (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    summary TEXT NULL,
    embedding TEXT NULL, -- JSON string of vector embedding
    total_conversations INTEGER DEFAULT 0,
    files_modified TEXT NULL, -- JSON array of file paths
    terminal_commands TEXT NULL, -- JSON array of commands
    success_rating REAL NULL, -- 0.0 to 1.0 success score
    FOREIGN KEY (folder_id) REFERENCES context_folders(id) ON DELETE CASCADE
);

-- Claude Conversations - Individual user/Claude exchanges
CREATE TABLE IF NOT EXISTS claude_conversations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_input TEXT NOT NULL,
    claude_reply TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    embedding TEXT NULL, -- JSON string of vector embedding
    success BOOLEAN NULL, -- Was this exchange successful?
    error_type TEXT NULL, -- Error category if failed
    context_used TEXT NULL, -- JSON of retrieved context
    files_involved TEXT NULL, -- JSON array of files mentioned
    tokens_used INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES context_sessions(id) ON DELETE CASCADE
);

-- Detected Patterns - Learned patterns from conversations
CREATE TABLE IF NOT EXISTS detected_patterns (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    pattern_type TEXT NOT NULL, -- 'error_solution', 'command_sequence', 'file_change', etc.
    description TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    confidence REAL DEFAULT 0.5, -- 0.0 to 1.0
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT NULL, -- JSON for additional pattern data
    FOREIGN KEY (session_id) REFERENCES context_sessions(id) ON DELETE CASCADE
);

-- Learned Insights - High-level insights across sessions
CREATE TABLE IF NOT EXISTS learned_insights (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,
    insight_type TEXT NOT NULL, -- 'common_error', 'successful_approach', 'efficiency_tip'
    content TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_sessions TEXT NULL, -- JSON array of session IDs that contributed
    FOREIGN KEY (folder_id) REFERENCES context_folders(id) ON DELETE CASCADE
);

-- Pattern Evolution - Track how patterns change over time
CREATE TABLE IF NOT EXISTS pattern_evolution (
    id TEXT PRIMARY KEY,
    pattern_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    evolution_type TEXT NOT NULL, -- 'strengthened', 'weakened', 'modified'
    confidence_before REAL NOT NULL,
    confidence_after REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pattern_id) REFERENCES detected_patterns(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES context_sessions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_context_folders_project_path ON context_folders(project_path);
CREATE INDEX IF NOT EXISTS idx_context_sessions_folder_id ON context_sessions(folder_id);
CREATE INDEX IF NOT EXISTS idx_context_sessions_start_time ON context_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_claude_conversations_session_id ON claude_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_claude_conversations_timestamp ON claude_conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_session_id ON detected_patterns(session_id);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_type ON detected_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learned_insights_folder_id ON learned_insights(folder_id);
CREATE INDEX IF NOT EXISTS idx_learned_insights_type ON learned_insights(insight_type);

-- Views for common queries
CREATE VIEW IF NOT EXISTS recent_conversations AS
SELECT 
    cc.*,
    cs.folder_id,
    cf.name AS folder_name,
    cf.project_path
FROM claude_conversations cc
JOIN context_sessions cs ON cc.session_id = cs.id
JOIN context_folders cf ON cs.folder_id = cf.id
ORDER BY cc.timestamp DESC;

CREATE VIEW IF NOT EXISTS session_stats AS
SELECT 
    cs.*,
    cf.name AS folder_name,
    cf.project_path,
    COUNT(cc.id) AS conversation_count,
    AVG(cc.tokens_used) AS avg_tokens_per_conversation,
    COUNT(CASE WHEN cc.success = 1 THEN 1 END) AS successful_conversations,
    COUNT(CASE WHEN cc.success = 0 THEN 1 END) AS failed_conversations
FROM context_sessions cs
JOIN context_folders cf ON cs.folder_id = cf.id
LEFT JOIN claude_conversations cc ON cs.id = cc.session_id
GROUP BY cs.id;

-- Initial data - Create default folder for current project
INSERT OR IGNORE INTO context_folders (id, project_path, name, auto_created)
VALUES ('default', '/Users/michaelkraft/autonomous_vibe_interface', 'Coder1 IDE', TRUE);