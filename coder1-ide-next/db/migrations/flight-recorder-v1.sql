-- Flight Recorder Schema v1
-- Index layer for session recordings. Bulk event data lives in JSONL files.

CREATE TABLE IF NOT EXISTS flight_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    status TEXT DEFAULT 'recording' CHECK(status IN ('recording', 'paused', 'completed', 'crashed')),
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    total_events INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    metadata TEXT,
    starred INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE TABLE IF NOT EXISTS flight_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    client_timestamp INTEGER NOT NULL,
    server_timestamp INTEGER NOT NULL,
    searchable_text TEXT,
    metadata TEXT,
    data_offset INTEGER,
    data_length INTEGER,
    FOREIGN KEY (flight_session_id) REFERENCES flight_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flight_terminal_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    terminal_buffer TEXT NOT NULL,
    FOREIGN KEY (flight_session_id) REFERENCES flight_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flight_annotations (
    id TEXT PRIMARY KEY,
    flight_session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    annotation_type TEXT DEFAULT 'note' CHECK(annotation_type IN ('note', 'breakthrough', 'bug', 'decision', 'wtf')),
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (flight_session_id) REFERENCES flight_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flight_events_session_ts ON flight_events(flight_session_id, client_timestamp);
CREATE INDEX IF NOT EXISTS idx_flight_events_type ON flight_events(event_type);
CREATE INDEX IF NOT EXISTS idx_flight_sessions_session ON flight_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_flight_sessions_started ON flight_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_flight_terminal_snapshots_ts ON flight_terminal_snapshots(flight_session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_flight_annotations_session_ts ON flight_annotations(flight_session_id, timestamp);

CREATE VIRTUAL TABLE IF NOT EXISTS flight_events_fts USING fts5(
    flight_session_id UNINDEXED,
    event_type UNINDEXED,
    searchable_text,
    content=flight_events,
    content_rowid=id
);

CREATE TRIGGER IF NOT EXISTS flight_events_fts_insert AFTER INSERT ON flight_events
WHEN new.searchable_text IS NOT NULL
BEGIN
    INSERT INTO flight_events_fts(rowid, flight_session_id, event_type, searchable_text)
    VALUES (new.id, new.flight_session_id, new.event_type, new.searchable_text);
END;

CREATE TRIGGER IF NOT EXISTS flight_events_fts_delete AFTER DELETE ON flight_events BEGIN
    DELETE FROM flight_events_fts WHERE rowid = old.id;
END;
