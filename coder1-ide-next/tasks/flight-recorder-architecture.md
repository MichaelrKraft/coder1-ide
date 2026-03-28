# Vibe Coding Flight Recorder - Architecture Decision Document

## Context

The Flight Recorder generalizes Coder1's existing session tracking (SessionSummaryService, checkpoints, timeline) into a continuous recording system for ALL coding sessions. It captures terminal I/O, file changes, AI interactions, errors, and breakthroughs -- then enables replay, search, and sharing.

**Existing infrastructure to build on:**
- `SessionSummaryService` -- collects open files, terminal history, errors, breakthroughs, session type detection
- `SessionContext` -- manages session lifecycle (create, switch, end) with mutex-based initialization
- Timeline page (`/timeline`) -- checkpoint viewer with restore, edit, delete, bulk operations
- FlowTrace panel -- existing replay/visualization component
- `context-memory.db` (SQLite via better-sqlite3) -- checkpoints, session summaries with FTS5 search
- JSON file storage (`data/sessions/`) -- checkpoint snapshots with manual/auto subdirectories
- Zustand stores (`useSessionStore`, `useIDEStore`, `useTerminalStore`) -- client-side state management
- Socket.IO -- real-time communication between IDE and server

---

## 1. Data Capture and Storage

### 1.1 Event Taxonomy

| Event Type | Source | Frequency | Avg Size | Priority |
|---|---|---|---|---|
| `terminal:input` | User keystrokes in terminal | High (~5/sec bursts) | 50-200 bytes | P1 |
| `terminal:output` | PTY stdout/stderr | Very High (~100 lines/sec during builds) | 100-10KB per chunk | P1 |
| `file:save` | Monaco editor save | Low (~2/min) | 50 bytes metadata + diff | P1 |
| `file:open` | Tab open/switch | Low (~1/min) | 50 bytes | P2 |
| `file:change` | Keystroke-level edits | Very High | Skip -- use save-point diffs only | P3 |
| `ai:prompt` | User sends to Claude | Low (~1/5min) | 200-5000 bytes | P1 |
| `ai:response` | Claude response chunks | Medium (streaming) | 500-50000 bytes | P1 |
| `ai:tool_use` | Claude tool invocations | Low | 200-2000 bytes | P1 |
| `error:terminal` | Error patterns in output | Medium | 200-2000 bytes | P1 |
| `error:runtime` | Uncaught exceptions | Low | 500-5000 bytes | P1 |
| `checkpoint:auto` | Periodic snapshots | Very Low (~1/5min) | 10-500KB | P2 |
| `checkpoint:manual` | User-triggered | Very Low | 10-500KB | P1 |
| `git:commit` | Git commit detected | Low | 200 bytes | P1 |
| `git:branch` | Branch switch | Very Low | 100 bytes | P2 |
| `session:start` | Session begins | Once | 200 bytes | P1 |
| `session:end` | Session ends | Once | 200 bytes | P1 |
| `session:idle` | User goes idle (>5min no input) | Low | 50 bytes | P2 |
| `session:active` | User returns from idle | Low | 50 bytes | P2 |
| `browser:focus` | Tab gains focus | Low | 50 bytes | P3 |
| `browser:blur` | Tab loses focus | Low | 50 bytes | P3 |

**What NOT to capture (Phase 1):**
- Clipboard content (privacy risk, minimal replay value)
- Browser tab switches outside Coder1 (invasive)
- Keystroke-level editor changes (massive data, save-diffs sufficient)
- Screenshot captures (CPU intensive, storage heavy -- FlowTrace already does this separately)
- Binary file contents (images, PDFs opened in editor)

### 1.2 Storage Growth Projections

**Per-session estimates (1 hour of active coding):**

| Category | Volume | Notes |
|---|---|---|
| Terminal I/O | 500KB - 5MB | Build output is the main driver |
| File save diffs | 50KB - 500KB | Depends on file count and change frequency |
| AI conversations | 100KB - 2MB | Long Claude responses dominate |
| Metadata events | 10KB - 50KB | Open/close/switch/error events |
| **Total per hour** | **~1MB - 8MB** | Compressed: ~200KB - 2MB |
| **8-hour day** | **~8MB - 64MB** | Compressed: ~2MB - 16MB |
| **Per month (20 work days)** | **~160MB - 1.3GB** | Compressed: ~40MB - 320MB |

**Conclusion:** With compression and retention policies, this is manageable. 30-day retention at worst case is ~1.3GB raw / ~320MB compressed. Acceptable for local storage.

### 1.3 Storage Architecture

**Recommendation: Hybrid SQLite + Append-Only Log Files**

```
data/flight-recorder/
  recorder.db              # SQLite: event index, session metadata, search
  sessions/
    {sessionId}/
      events.jsonl         # Append-only JSONL: all events (one JSON object per line)
      events.jsonl.1       # Rotated log (when current exceeds 10MB)
      terminal-chunks/     # Large terminal output stored separately
        chunk-{timestamp}.txt
```

**Why this hybrid approach:**

1. **SQLite for indexing and search** -- Event metadata (timestamp, type, session, searchable text) goes into SQLite with FTS5. This enables fast seeking, filtering, and full-text search without scanning raw data.

2. **JSONL files for bulk event data** -- Append-only writes are crash-safe (no corrupted JSON arrays). JSONL allows streaming reads for replay without loading entire sessions into memory. Large terminal output chunks are stored as separate files to prevent bloating the JSONL.

3. **Reuses existing patterns** -- The codebase already uses `better-sqlite3` for `context-memory.db` and JSON files for checkpoint data. This is a natural extension.

**Why NOT other options:**

- **IndexedDB only**: No server-side access, lost on browser clear, 50MB soft limit in some browsers, no full-text search. Session data needs to survive browser crashes.
- **SQLite only**: Terminal output blobs would bloat the database. The current checkpoint system already has an `OVERSIZED_BACKUP` pattern for large data, proving this is a real concern.
- **Server-side only**: Adds network latency to every event write. Incompatible with offline/disconnected usage.
- **Pure JSON files**: No indexing, no search, O(n) seeking for replay.

### 1.4 Write Strategy

**Batched writes with WAL (Write-Ahead Log) buffer:**

```
Events flow:
  [Event emitted]
    -> In-memory ring buffer (max 500 events, ~2MB)
    -> Flush to JSONL every 3 seconds OR when buffer hits 200 events
    -> Index metadata to SQLite on flush
    -> On session end: final flush + write session summary
```

**Crash protection:**
- Ring buffer in `SharedArrayBuffer` or `BroadcastChannel` -- survives tab refreshes (not full browser crashes)
- `beforeunload` handler triggers synchronous flush of critical events
- `navigator.sendBeacon` as last resort for session-end marker
- On next session start: detect orphaned sessions (no `session:end` event), mark as `crashed`, recover buffered data from JSONL

**Terminal output special handling:**
- Terminal output arrives in high-frequency bursts (npm install, build logs)
- Deduplicate repeated lines (common in watch mode: "Compiled successfully" x1000)
- Coalesce rapid-fire output into 100ms windows
- Store raw chunks > 10KB as separate files, reference by path in JSONL
- Apply streaming compression (gzip) to terminal chunk files

### 1.5 Retention and Cleanup

**Tiered retention policy:**

| Age | Action |
|---|---|
| 0-7 days | Full fidelity -- all events, all terminal output |
| 7-30 days | Compact -- merge terminal output into summary, keep file diffs and AI conversations |
| 30-90 days | Skeleton -- session metadata, AI conversations, key events only |
| 90+ days | Delete unless starred/bookmarked by user |

**Auto-cleanup trigger:** Run on session start, max once per 24 hours. Check total `flight-recorder/` size. If > 2GB, aggressively compact oldest sessions first.

**User controls:**
- Star/pin sessions to prevent auto-cleanup
- Manual "Delete all recordings" button
- Per-session delete from timeline UI
- Export before delete option

### 1.6 Sensitive Data Handling

**This is a critical security concern.** Terminal output routinely contains:
- API keys typed or echoed (e.g., `export ANTHROPIC_API_KEY=sk-...`)
- Passwords in `mysql -p`, `ssh`, `sudo`
- `.env` file contents displayed via `cat`
- OAuth tokens in curl responses

**Mitigation strategy:**

1. **Pre-storage scrubbing** -- Apply regex patterns before writing to JSONL:
   - `/(sk-[a-zA-Z0-9]{20,})/g` -> `[REDACTED_API_KEY]`
   - `/(password|passwd|pwd)\s*[:=]\s*\S+/gi` -> `$1=[REDACTED]`
   - `/(Bearer\s+)[a-zA-Z0-9._-]+/g` -> `$1[REDACTED_TOKEN]`
   - `/(ANTHROPIC_API_KEY|OPENAI_API_KEY|AWS_SECRET)[=:]\s*\S+/gi` -> `$1=[REDACTED]`
   - Common patterns: `ghp_`, `gho_`, `github_pat_`, `xoxb-`, `xoxp-`

2. **Never record stdin when PTY is in raw/password mode** -- Detect when terminal echo is disabled (password prompts) and pause input recording.

3. **User notification** -- When scrubbing detects a potential secret, show a brief toast: "Sensitive data detected and redacted in recording."

4. **Export redaction** -- Before any session sharing/export, run an additional deep scrub pass.

5. **Encryption at rest** -- Optional: encrypt JSONL files with a user-provided key. Not Phase 1 but should be designed for.

---

## 2. Performance Impact

### 2.1 Memory Pressure

**Problem:** An 8-hour session could accumulate 50,000+ events. Holding all in memory would consume 50-200MB.

**Solution: Sliding window architecture**

- In-memory ring buffer holds only the last 500 events (~2MB max)
- Replay loads events on-demand from JSONL files using streaming reads
- Event index in SQLite enables O(log n) seeking without loading event data
- Terminal output chunks are memory-mapped, not loaded until replay reaches them

**Memory budget:** Flight Recorder should never exceed 10MB of heap at steady state. The ring buffer, SQLite WAL cache, and metadata together should stay under this.

### 2.2 Write Throughput

**SQLite with WAL mode handles this easily:**
- better-sqlite3 (synchronous API) can do ~50,000 inserts/sec with WAL mode
- Our flush rate is ~67 events/sec at most (200 events per 3 seconds)
- JSONL append is even cheaper -- single `fs.appendFile` call
- Bottleneck is not write speed but ensuring writes don't block the event loop

**Critical: All writes must happen on the server side (Next.js API routes or server.js)**
- Client captures events and sends via Socket.IO or batched HTTP POST
- Server appends to JSONL and indexes in SQLite
- This keeps the browser main thread free

### 2.3 Main Thread Protection

**Client-side event collection must be zero-jank:**

- Terminal events: Hook into existing xterm.js `onData` and `onWriteParsed` -- already in use, just add a lightweight callback
- File events: Hook into Monaco `onDidSaveModel` -- already tracked
- AI events: Hook into existing `claude-service.ts` request/response flow
- Error events: Hook into existing `extractErrorsFromTerminal` pattern

**Event collection code path:**
```
[Event source] -> eventCollector.record(event)  // <1ms, just pushes to array
  -> Batched via requestIdleCallback or setTimeout(3000)
  -> POST /api/flight-recorder/events (batch of 50-200 events)
  -> Server writes to JSONL + SQLite
```

**Key principle:** Event collection adds a single array push. No serialization, no I/O, no computation on the hot path.

### 2.4 Network Overhead

- Batched events sent every 3 seconds: ~5-50KB per batch
- Uses existing Socket.IO connection (no new WebSocket)
- Compression via Socket.IO's built-in perMessageDeflate
- If Socket.IO is disconnected, events queue locally and flush on reconnect
- Total added bandwidth: ~100KB-500KB per minute during active coding. Negligible.

### 2.5 Battery/CPU Impact

- No continuous polling or timers shorter than 3 seconds
- No screen capture (FlowTrace handles that separately if enabled)
- No AI analysis during recording (analysis happens on replay)
- Estimated: <1% additional CPU usage. No measurable battery impact.

---

## 3. Replay Experience

### 3.1 Time Gap Handling

**Problem:** User codes for 2 hours, goes to lunch for 2 hours, codes for 3 more hours. Replaying 7 hours of wall clock time is 5 hours of dead air.

**Solution: Intelligent time compression**

- Detect idle periods (>2 minutes with no events)
- In replay, show a "skipped ahead" indicator: "2h 15m idle -- jumped to next activity"
- Auto-compress gaps: anything > 2 minutes shows as a brief interstitial
- Activity heat map on the timeline scrubber shows where work actually happened
- User can toggle between "wall clock" and "activity time" modes

**Idle detection events:**
- `session:idle` emitted when no events for 5 minutes
- `session:active` emitted on next event after idle
- These markers enable the replayer to calculate skip ranges without scanning all events

### 3.2 Playback Speed Controls

**Standard speeds:** 1x, 2x, 5x, 10x, 50x (for scanning)

**Smart speed:**
- Auto-accelerate during repetitive terminal output (build logs, test runs)
- Auto-decelerate when errors appear or AI conversations start
- "Highlights only" mode: jump between key events (errors, breakthroughs, commits, AI prompts)

**Implementation:** Playback engine maintains a `playbackCursor` (timestamp) and advances it based on speed multiplier. Events between current cursor and next cursor position are rendered in batch.

### 3.3 Seeking and Navigation

**Problem:** Seeking to minute 47 of a 3-hour session with 20,000 events must be instant.

**Solution: SQLite event index with timestamp-based seeking**

```sql
-- Seek to a specific timestamp
SELECT * FROM flight_events
WHERE session_id = ? AND timestamp >= ?
ORDER BY timestamp ASC
LIMIT 100;
```

- SQLite index on `(session_id, timestamp)` enables O(log n) seeking
- Load 100 events ahead of seek point into buffer
- Pre-fetch the next 100 as user approaches buffer end
- Terminal state reconstruction: store periodic terminal snapshots (every 5 minutes) so seeking doesn't require replaying from start

**Terminal state snapshots:**
- Every 5 minutes, serialize the xterm.js terminal buffer as a snapshot
- On seek: load nearest snapshot before target time, then replay events from snapshot to target
- Worst case: replay 5 minutes of terminal events. At 10x speed this takes seconds.

### 3.4 Terminal Replay

**Recommendation: Re-render through xterm.js, NOT screenshots**

- Create a read-only xterm.js instance for replay
- Feed recorded output events into the terminal at playback speed
- This gives pixel-perfect rendering, text selection, search within replay
- Terminal snapshots (from 3.3) provide restoration points for seeking

**Why not screenshots:**
- Screenshots are 100-500KB each at useful resolution
- 1 screenshot/second for 1 hour = 360MB-1.8GB. Unacceptable.
- Text is not selectable or searchable in screenshots
- FlowTrace already handles the screenshot approach for its specific use case

### 3.5 File Diff Visualization

- On `file:save` events, show a split diff view (Monaco diff editor)
- Diffs stored as unified diff format (compact, standard)
- Click on any file save event in timeline to see before/after
- "File journey" view: see all changes to a single file across the session

### 3.6 AI Conversation Threading

- AI prompt/response pairs grouped as conversation threads
- Show thinking indicators, tool use, and response streaming during replay
- Link AI suggestions to the file changes they produced
- "AI Decision Points" -- highlight moments where AI suggested something and user accepted/rejected

### 3.7 Annotations and Bookmarks

**Post-hoc annotations:**
- User can pause replay at any point and add a text annotation
- Annotations stored as events with type `annotation` at the associated timestamp
- Special annotation types: "Breakthrough", "Bug Found", "Key Decision", "WTF Moment"
- Annotations are searchable via FTS5

**Auto-generated bookmarks:**
- Error events automatically bookmarked
- Git commits automatically bookmarked
- AI conversation starts automatically bookmarked
- User can delete auto-bookmarks they don't want

---

## 4. Feature Flag Implementation

### 4.1 Flag Granularity

```typescript
interface FlightRecorderFlags {
  // Master switch
  enabled: boolean;

  // Granular controls
  captureTerminal: boolean;
  captureFiles: boolean;
  captureAI: boolean;
  captureErrors: boolean;

  // Features
  replayEnabled: boolean;
  searchEnabled: boolean;
  sharingEnabled: boolean;

  // Performance tuning
  flushIntervalMs: number;       // Default: 3000
  maxBufferSize: number;         // Default: 200
  terminalChunkThreshold: number; // Default: 10240 (10KB)

  // Retention
  retentionDays: number;         // Default: 30
  maxStorageMB: number;          // Default: 2048
}
```

**Storage:** In `user_preferences` table (already exists in schema.sql) and/or localStorage for client-side checks.

### 4.2 Toggle Behavior

- **Flag toggled OFF while recording:** Current session recording stops. Buffered events are flushed and session is marked as `ended:flag_disabled`. Previously recorded data is preserved (not deleted).
- **Flag toggled ON:** New recording starts on next session (or immediately if mid-session).
- **Never auto-delete data when toggling off.** User can manually delete if desired.

### 4.3 Recording Indicator

**Location: Status bar (StatusBarCore.tsx), left side**

```
[Recording indicator] | [Session name] | [Connection status] | ...
```

- Red pulsing dot + "REC" text when recording
- Click to pause/resume recording for current session
- Tooltip shows: "Flight Recorder active -- X events captured this session"
- Right-click for quick settings (disable, open timeline, pause)

**Why status bar:** It's always visible, doesn't consume vertical space, follows convention (VS Code shows recording indicators in status bar). The existing `StatusBarCore.tsx` already has left-side indicators.

### 4.4 Privacy Consent Flow

On first enable:
1. Modal explains what will be recorded
2. Checkboxes for each category (terminal, files, AI -- all checked by default)
3. Explain sensitive data scrubbing
4. "I understand" confirmation button
5. Store consent timestamp in `user_preferences`

---

## 5. Team and Collaboration Edge Cases

### 5.1 Session Sharing Model

**Shareable unit:** A "Session Recording" export package.

**What gets shared:**
- Event timeline (with sensitive data deep-scrubbed)
- File diffs (but NOT full file contents -- IP protection)
- AI conversation threads
- Terminal output (scrubbed)
- Annotations and bookmarks
- Session metadata (duration, type, technologies)

**What NEVER gets shared:**
- Raw terminal input (could contain passwords)
- Full file contents (use diffs only)
- Environment variables
- Clipboard history
- Local file paths (anonymized to relative paths)

### 5.2 Permissions Model

**Phase 1: Export-based sharing only.** No live access to another user's recordings.

- User exports a session recording as a `.coder1-recording` file (JSON + compressed JSONL)
- Recipient imports into their own Coder1 instance for replay
- No server-side sharing, no permission management needed
- This is the simplest possible approach and avoids all the manager-surveillance concerns

**Phase 2 (future): Team recordings**
- Opt-in only: developer chooses to share specific sessions
- No "manager can see all recordings" feature. This would kill adoption.
- Shared recordings stored in team's shared space (Supabase or similar)
- Same scrubbing rules as export

### 5.3 Pair Programming

**Problem:** Two people working on the same session (via screenshare, VS Code Live Share, or future Coder1 collaboration).

**Solution:** Record as a single session with participant markers.
- Events tagged with `actor: 'user1' | 'user2'`
- Replay can filter by participant
- Voice/video is NOT recorded (use meeting recording tools for that)

### 5.4 Time Zones

- All timestamps stored as UTC epoch milliseconds (already the pattern in the codebase)
- Display converted to user's local timezone
- Shared recordings show timestamps in viewer's timezone
- Session duration calculated from UTC, not local time

---

## 6. Data Integrity and Recovery

### 6.1 Out-of-Order Events

**Problem:** Network latency or batched writes could deliver events out of order.

**Solution:**
- Each event has a `clientTimestamp` (when it occurred) and `serverTimestamp` (when received)
- Sort by `clientTimestamp` for replay
- If `clientTimestamp` drift > 5 seconds from `serverTimestamp`, log a warning (possible clock skew)
- JSONL files are append-only -- order reflects arrival. SQLite index sorts by `clientTimestamp`.

### 6.2 SQLite Corruption Recovery

- WAL mode reduces corruption risk dramatically
- `PRAGMA integrity_check` on database open
- If corruption detected: rebuild index from JSONL files (they are the source of truth)
- JSONL files are append-only text -- virtually incorruptible (worst case: truncated last line)

### 6.3 Schema Migration

**Use the existing pattern:** The codebase already has migration SQL files (e.g., `db/add-checkpoint-type.sql`).

- Version number stored in `user_preferences` table: `flight_recorder_schema_version`
- On startup, compare current version to expected, run migration scripts sequentially
- Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)

### 6.4 Export/Import

**Export format:** `.coder1-recording` (gzipped tar)
```
session-recording/
  manifest.json          # Version, session metadata, schema version
  events.jsonl.gz        # All events (scrubbed)
  annotations.json       # User annotations
  terminal-snapshots/    # Terminal state snapshots for seeking
```

**Import:** Validate manifest version, check schema compatibility, insert into local SQLite + JSONL storage.

### 6.5 GDPR Right to Delete

- `DELETE FROM flight_events WHERE session_id = ?` + delete JSONL files
- "Delete all my recordings" button in settings
- Export-then-delete workflow for users who want backup first
- No server-side storage in Phase 1, so deletion is purely local

---

## 7. Integration Points

### 7.1 Git Integration

- Detect `git commit` events by watching terminal output for commit hashes
- Auto-bookmark commits in the session timeline
- Link: "This commit was made during [Session X] at [timestamp]"
- "What sessions produced this commit?" -- query by commit hash across all sessions
- On `git checkout -b`: mark session segment boundary ("Started working on feature/X")

### 7.2 PR Integration (Future)

- "What sessions produced this PR?" -- aggregate sessions between branch creation and PR open
- Session recordings linkable from PR description
- Code review enhancement: reviewer can see *how* code was written, not just the final diff

### 7.3 Error Tracking

- Existing `extractErrorsFromTerminal` patterns already detect errors
- Flight Recorder adds: timeline context around each error (what happened 30 seconds before)
- "Error replay" -- click an error to see the exact moment it occurred with full context
- Error frequency analysis across sessions

### 7.4 Full-Text Search

**Leverages existing FTS5 infrastructure in context-memory.db:**

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS flight_events_fts USING fts5(
    session_id UNINDEXED,
    event_type UNINDEXED,
    searchable_text,
    content=flight_events,
    content_rowid=rowid
);
```

**Searchable content:**
- Terminal commands (input)
- Terminal output (first 500 chars per chunk)
- AI prompts and responses
- File names
- Error messages
- Annotations

**Search UI:** Global search bar on the recordings dashboard. "Find the session where I fixed the Socket.IO timeout bug" -> searches across all sessions.

---

## 8. UI/UX Details

### 8.1 Recording Indicator

**Location:** Left side of `StatusBarCore.tsx`

**States:**
- **Recording:** Red pulsing dot + "REC" + event counter
- **Paused:** Orange dot + "PAUSED"
- **Disabled:** No indicator (clean)
- **Error:** Red exclamation + "REC ERROR" (storage full, write failure)

### 8.2 Session Start/Stop

**Automatic start:** Recording begins when a Coder1 session starts (uses existing `SessionContext` lifecycle).

**Automatic stop:** Recording ends when session ends OR browser closes (with `beforeunload` flush).

**Manual pause:** User clicks the recording indicator to pause. Pausing inserts a `recording:paused` event. Useful for: about to type a password, about to discuss something confidential.

**No manual "start recording" button.** If the feature flag is on, it records. Simplicity.

### 8.3 Session Naming

**Auto-generated names (extend existing pattern from SessionContext):**
- `"{TimeOfDay} {SessionType} - {Date} {Time}"` (e.g., "Morning Debugging - Mar 27, 9:15 AM")
- Enrich after session ends: append most-modified file or git branch name
- User can rename at any time (inline edit, same as checkpoint rename)

### 8.4 Recordings Dashboard

**Location:** New tab on the existing `/timeline` page (alongside "Checkpoints" and "FlowTrace")

**Features:**
- List of recorded sessions with: name, date, duration, event count, session type badge
- Search bar (FTS5 powered)
- Filter by: date range, session type, has errors, has AI conversations
- Click to open replay view
- Bulk delete, export, star/pin actions

### 8.5 Replay View

**Full-screen layout:**

```
+------------------------------------------------------------------+
| [<< Back] [Session Name]              [1x] [2x] [5x] [10x] [>>] |
+------------------------------------------------------------------+
| Timeline Scrubber with activity heatmap                           |
| |====....========...=======.....==============|                   |
+------------------------------------------------------------------+
|                    |                    |                          |
|  Terminal Replay   |  File Diff View    |  AI Conversation        |
|  (xterm.js)        |  (Monaco diff)     |  Thread                 |
|                    |                    |                          |
|                    |                    |                          |
+------------------------------------------------------------------+
| Event log (scrolling list of all events, highlighted at current)  |
+------------------------------------------------------------------+
```

### 8.6 Mobile/Responsive

- Recording works on any screen size (it's background)
- Replay view: stack panels vertically on mobile
- Dashboard: responsive card grid
- Timeline scrubber: full-width with touch-friendly handles
- Not a Phase 1 priority -- Coder1 IDE is primarily a desktop experience

---

## 9. SQLite Schema for Flight Recorder

```sql
-- Flight Recorder Sessions
CREATE TABLE IF NOT EXISTS flight_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,           -- Links to existing context_sessions
    status TEXT DEFAULT 'recording',    -- 'recording', 'paused', 'completed', 'crashed'
    started_at INTEGER NOT NULL,        -- UTC epoch ms
    ended_at INTEGER,                   -- UTC epoch ms
    total_events INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    metadata TEXT,                       -- JSON: technologies, session type, etc.
    starred BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (session_id) REFERENCES context_sessions(id) ON DELETE CASCADE
);

-- Flight Recorder Event Index (metadata only -- bulk data in JSONL files)
CREATE TABLE IF NOT EXISTS flight_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,            -- 'terminal:input', 'file:save', etc.
    client_timestamp INTEGER NOT NULL,   -- UTC epoch ms (when event occurred)
    server_timestamp INTEGER NOT NULL,   -- UTC epoch ms (when server received)
    searchable_text TEXT,                -- Extracted text for FTS5
    metadata TEXT,                        -- JSON: file path, command, error type, etc.
    data_offset INTEGER,                 -- Byte offset in JSONL file (for fast retrieval)
    data_length INTEGER,                 -- Byte length in JSONL file
    FOREIGN KEY (flight_session_id) REFERENCES flight_sessions(id) ON DELETE CASCADE
);

-- Terminal State Snapshots (for fast seeking)
CREATE TABLE IF NOT EXISTS flight_terminal_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    terminal_buffer TEXT NOT NULL,        -- Serialized xterm.js buffer
    FOREIGN KEY (flight_session_id) REFERENCES flight_sessions(id) ON DELETE CASCADE
);

-- User Annotations
CREATE TABLE IF NOT EXISTS flight_annotations (
    id TEXT PRIMARY KEY,
    flight_session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,          -- The moment being annotated
    annotation_type TEXT DEFAULT 'note', -- 'note', 'breakthrough', 'bug', 'decision', 'wtf'
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (flight_session_id) REFERENCES flight_sessions(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flight_events_session_ts
    ON flight_events(flight_session_id, client_timestamp);
CREATE INDEX IF NOT EXISTS idx_flight_events_type
    ON flight_events(event_type);
CREATE INDEX IF NOT EXISTS idx_flight_sessions_session
    ON flight_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_flight_sessions_started
    ON flight_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_flight_terminal_snapshots_ts
    ON flight_terminal_snapshots(flight_session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_flight_annotations_session_ts
    ON flight_annotations(flight_session_id, timestamp);

-- FTS5 for full-text search across recordings
CREATE VIRTUAL TABLE IF NOT EXISTS flight_events_fts USING fts5(
    flight_session_id UNINDEXED,
    event_type UNINDEXED,
    searchable_text,
    content=flight_events,
    content_rowid=id
);

-- Keep FTS in sync
CREATE TRIGGER IF NOT EXISTS flight_events_fts_ai AFTER INSERT ON flight_events BEGIN
    INSERT INTO flight_events_fts(rowid, flight_session_id, event_type, searchable_text)
    VALUES (new.id, new.flight_session_id, new.event_type, new.searchable_text);
END;

CREATE TRIGGER IF NOT EXISTS flight_events_fts_ad AFTER DELETE ON flight_events BEGIN
    DELETE FROM flight_events_fts WHERE rowid = old.id;
END;
```

---

## 10. Implementation Phases

### Phase 1: Core Recording (2-3 weeks)
- [ ] Feature flag infrastructure
- [ ] Event collector (client-side ring buffer)
- [ ] Server-side JSONL writer + SQLite indexer
- [ ] API routes: POST events, GET session events, GET sessions list
- [ ] Recording indicator in status bar
- [ ] Terminal, file save, and error event capture
- [ ] Sensitive data scrubbing
- [ ] Basic retention/cleanup

### Phase 2: Replay (2-3 weeks)
- [ ] Timeline scrubber component
- [ ] Terminal replay (read-only xterm.js)
- [ ] File diff viewer integration
- [ ] Playback speed controls
- [ ] Time gap compression
- [ ] Seeking via SQLite index + terminal snapshots

### Phase 3: Search and Intelligence (1-2 weeks)
- [ ] FTS5 search across recordings
- [ ] Recordings dashboard tab on /timeline
- [ ] Annotations and bookmarks
- [ ] Auto-bookmarks for errors, commits, AI conversations
- [ ] Git commit linking

### Phase 4: Sharing and Polish (1-2 weeks)
- [ ] Export as .coder1-recording
- [ ] Import recording
- [ ] Deep scrub on export
- [ ] AI conversation threading in replay
- [ ] "Highlights only" playback mode
- [ ] Session type auto-detection improvements

---

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Storage fills up silently | Medium | High | Proactive warnings at 75% of budget. Auto-compact old sessions. |
| Sensitive data leaks into recording | High | Critical | Pre-storage scrubbing + deep scrub on export. Paranoid regex patterns. |
| Performance regression from recording | Low | High | Ring buffer + batched writes. Load test with 8-hour sessions. |
| SQLite database corruption | Low | Medium | WAL mode + integrity checks. JSONL is source of truth for rebuild. |
| Terminal replay drift (out of sync) | Medium | Medium | Periodic terminal snapshots as sync points. |
| Feature flag confusion (data still captured when "off") | Low | Medium | Clear UI: recording indicator visible when active, absent when not. |
| JSONL files grow unbounded in long sessions | Medium | Medium | 10MB rotation + terminal chunk extraction. |
| Browser crash loses buffered events | Medium | Low | Accept ~3 seconds of data loss. `beforeunload` flush. `sendBeacon` fallback. |

---

## 12. Key Architecture Decisions Summary

1. **Hybrid SQLite + JSONL** over pure SQLite or pure files -- best of both worlds for indexing and bulk storage.
2. **Server-side writes** over client-side IndexedDB -- survives browser crashes, enables server-side search.
3. **Append-only JSONL** over mutable JSON arrays -- crash-safe, streamable, simple.
4. **xterm.js re-render** over screenshots for terminal replay -- 1000x less storage, text is selectable.
5. **Batched writes (3s/200 events)** over per-event writes -- performance with acceptable data loss window.
6. **Automatic recording** over manual start -- reduces friction, captures everything.
7. **Export-based sharing** over live access -- avoids surveillance concerns, simpler security model.
8. **Pre-storage scrubbing** over post-hoc redaction -- secrets never touch disk in cleartext.
9. **New tab on /timeline** over new page -- leverages existing navigation, reduces surface area.
10. **Extend context-memory.db** over new database file -- single database to manage, shared FTS infrastructure.
