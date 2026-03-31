# Flight Recorder - Implementation Plan

## Overview

Add a "Flight Recorder" feature to Coder1 IDE behind a feature flag. Records everything that happens during a coding session (terminal I/O, file changes, AI interactions, errors, git events) and enables replay, search, and export.

**Key principle:** This is NOT a new product — it's a natural extension of Coder1's existing session infrastructure. ~70% of the data capture already exists. The gap is persistent storage + replay UI.

---

## Phase 1: Foundation (Feature Flag + Storage + Event Collector)

### 1.1 Feature Flag: `FLIGHT_RECORDER`
- [ ] Add `NEXT_PUBLIC_FLIGHT_RECORDER_ENABLED=false` to `.env.example` and `.env.local`
- [ ] Add `FLIGHT_RECORDER` to existing `config/feature-flags.ts` FeatureFlagManager
- [ ] Create `lib/hooks/useFlightRecorder.ts` — React hook that checks flag + returns recorder state
- [ ] Add toggle in Settings modal (under a new "Flight Recorder" section)
- [ ] Privacy consent modal on first enable (explains what's recorded, shows scrubbing info)
- [ ] Flag controls: master on/off, per-category toggles (terminal, files, AI, errors)

**Edge cases:**
- Flag toggled OFF mid-session: flush buffer, mark session `ended:flag_disabled`, preserve data
- Flag toggled ON mid-session: start recording immediately from current moment
- User clears localStorage: consent must be re-shown (store consent in server-side preferences too)

### 1.2 SQLite Schema + Storage Layer
- [ ] Create `data/flight-recorder/` directory structure
- [ ] Create migration: `db/migrations/flight-recorder-v1.sql` with tables:
  - `flight_sessions` — links to existing session IDs, status, timestamps, metadata, starred flag
  - `flight_events` — event index with type, timestamps (client + server), searchable_text, JSONL offset
  - `flight_terminal_snapshots` — periodic xterm.js buffer serializations (every 5 min) for fast seeking
  - `flight_annotations` — user-added notes at specific timestamps
  - FTS5 virtual table + sync triggers for full-text search
- [ ] Create `lib/flight-recorder/storage.ts` — FlightRecorderStorage class:
  - `initSession(sessionId)` — create flight_sessions row + JSONL file
  - `appendEvents(events[])` — append to JSONL + index in SQLite
  - `endSession(sessionId)` — flush, update status, calculate totals
  - `getEvents(sessionId, startTs?, endTs?, limit?)` — query by time range
  - `searchEvents(query, sessionId?)` — FTS5 search
  - `cleanup(retentionDays)` — tiered retention (7d full, 30d compact, 90d skeleton)
- [ ] JSONL rotation: new file when current exceeds 10MB
- [ ] Terminal chunk extraction: output > 10KB stored as separate gzipped files

**Storage projections:**
- ~1-8MB/hour, ~8-64MB/day, ~160MB-1.3GB/month (raw)
- With compression: ~40-320MB/month
- Auto-cleanup at 2GB total

**Edge cases:**
- Browser crash mid-session: detect orphaned sessions on next start (no `session:end` event), mark as `crashed`
- SQLite corruption: WAL mode + integrity check on open; rebuild index from JSONL (source of truth)
- Storage full: proactive warning at 75% budget, auto-compact oldest non-starred sessions

### 1.3 Sensitive Data Scrubbing
- [ ] Create `lib/flight-recorder/scrubber.ts` — SecretScrubber class:
  - Pre-storage scrub (runs before every JSONL write)
  - Deep scrub (runs before export/sharing — more aggressive)
  - Patterns: `sk-*`, `ghp_*`, `gho_*`, `github_pat_*`, `xoxb-*`, Bearer tokens, password prompts, AWS keys, ANTHROPIC_API_KEY, OPENAI_API_KEY
  - Password mode detection: pause terminal:input recording when PTY echo is disabled
- [ ] Toast notification when scrubbing detects a potential secret
- [ ] Unit tests for every scrubbing pattern (critical — false negatives = leaked secrets)

**Edge cases:**
- Multi-line secrets (e.g., PEM keys pasted into terminal): multi-line pattern matching
- Secrets in AI responses (Claude might echo back an API key): scrub AI response content too
- Partial matches: prefer over-scrubbing to under-scrubbing (`[REDACTED]` is better than leaked key)
- `.env` file contents displayed via `cat .env`: detect env file dumps and scrub aggressively

### 1.4 Client-Side Event Collector
- [ ] Create `lib/flight-recorder/event-collector.ts` — EventCollector class:
  - Ring buffer (max 500 events, ~2MB cap)
  - Flush every 3 seconds OR when buffer hits 200 events
  - Uses existing Socket.IO connection (new `flight-recorder:events` channel)
  - `beforeunload` handler for emergency flush
  - `navigator.sendBeacon` fallback for session-end marker
- [ ] Hook into existing capture points (NO new capture — just tap existing flows):
  - Terminal: xterm.js `onData` (input) + `onWriteParsed` (output) — already in Terminal.tsx
  - File saves: Monaco `onDidSaveModel` — already in MonacoEditor.tsx
  - File opens/switches: already tracked in useIDEStore
  - AI prompts/responses: already in claude-service.ts / claude-api.ts
  - Errors: already in memory-detection-service / extractErrorsFromTerminal
  - Git events: detect commit/branch in terminal output patterns
- [ ] Event deduplication for terminal output (collapse repeated "Compiled successfully" lines)
- [ ] Terminal output coalescing: batch rapid-fire output into 100ms windows

**Event schema:**
```typescript
interface FlightEvent {
  id: string;                    // UUID
  type: FlightEventType;         // 'terminal:input' | 'terminal:output' | 'file:save' | etc.
  clientTimestamp: number;       // UTC epoch ms (when it happened)
  sessionId: string;             // Links to Coder1 session
  data: Record<string, unknown>; // Event-specific payload
  searchableText?: string;       // Extracted text for FTS5
}
```

**Performance budget:**
- Event collection: <1ms per event (single array push, no serialization on hot path)
- Memory: <10MB heap at steady state
- Network: ~100-500KB/min during active coding (batched via Socket.IO)
- CPU: <1% additional usage

**Edge cases:**
- Socket.IO disconnected: queue locally, flush on reconnect (max 5MB local queue, drop oldest if exceeded)
- Very long sessions (8+ hours): ring buffer prevents unbounded memory growth
- Tab backgrounded: browser may throttle timers — use `requestIdleCallback` with `setTimeout` fallback
- Multiple Coder1 tabs: each tab records independently, server merges by session ID

### 1.5 Server-Side Event Writer
- [ ] Create `lib/flight-recorder/writer.ts` — FlightRecorderWriter class:
  - Receives batched events via Socket.IO
  - Scrubs sensitive data
  - Appends to JSONL file
  - Indexes metadata in SQLite
  - Generates terminal snapshots every 5 minutes
- [ ] Add Socket.IO handler in server.js: `flight-recorder:events` channel
- [ ] Follow existing optional service loading pattern: `try { require } catch { warn; null }`
- [ ] Non-blocking: all writes are async, never block Socket.IO event loop

### 1.6 API Routes
- [ ] `POST /api/flight-recorder/events` — batch event ingestion (fallback if Socket.IO unavailable)
- [ ] `GET /api/flight-recorder/sessions` — list recorded sessions with metadata
- [ ] `GET /api/flight-recorder/sessions/[id]` — session detail + event summary
- [ ] `GET /api/flight-recorder/sessions/[id]/events` — paginated events with time range filter
- [ ] `DELETE /api/flight-recorder/sessions/[id]` — delete session + JSONL + SQLite entries
- [ ] `POST /api/flight-recorder/sessions/[id]/star` — toggle star/pin
- [ ] `POST /api/flight-recorder/cleanup` — manual trigger for retention cleanup

### 1.7 Recording Indicator (Status Bar)
- [ ] Add to `StatusBarCore.tsx` left side:
  - **Recording:** Red pulsing dot + "REC" + event counter
  - **Paused:** Orange dot + "PAUSED"
  - **Error:** Red exclamation + "REC ERROR" (storage full, write failure)
  - **Disabled:** No indicator
- [ ] Click to pause/resume recording
- [ ] Right-click context menu: disable, open recordings, pause
- [ ] Tooltip: "Flight Recorder active — X events captured"

---

## Phase 2: Replay Experience

### 2.1 Recordings Dashboard (New Tab on /timeline)
- [ ] Add "Recordings" tab to existing `/timeline` page tab system
- [ ] Session list: name, date, duration, event count, session type badge, starred indicator
- [ ] Search bar powered by FTS5
- [ ] Filters: date range, session type, has errors, has AI conversations, starred only
- [ ] Bulk actions: delete, export, star/unstar
- [ ] Click to open replay view

### 2.2 Timeline Scrubber Component
- [ ] Reuse/extend Johnny5 TimelineScrubber pattern (355 lines already built)
- [ ] Activity heatmap overlay — dense bars where events are clustered, gaps where idle
- [ ] Bookmark markers on scrubber (auto: errors, commits, AI starts; manual: user annotations)
- [ ] Draggable playhead with timestamp tooltip
- [ ] Minimap for long sessions (collapsed overview)

### 2.3 Terminal Replay Panel
- [ ] Read-only xterm.js instance
- [ ] Feed recorded `terminal:output` events at playback speed
- [ ] Use terminal snapshots for fast seeking (load nearest snapshot, replay from there)
- [ ] Worst case seek latency: replay 5 min of events at 10x = seconds

**Edge cases:**
- Terminal resize events during session: store resize events, apply during replay
- ANSI escape codes: xterm.js handles natively (colors, cursor movement)
- Very large build output: coalesced during recording, replayed as single chunk

### 2.4 File Diff Panel
- [ ] Monaco diff editor (already available in Coder1)
- [ ] On `file:save` events: show before/after split diff
- [ ] "File journey" mode: all changes to one file across the session
- [ ] Click any file event in timeline to jump to that diff

### 2.5 AI Conversation Panel
- [ ] Show AI prompt/response pairs as threaded conversation
- [ ] Highlight tool_use events within conversations
- [ ] Link AI suggestions to resulting file changes
- [ ] "AI Decision Points" — moments where AI suggested something and user accepted/rejected

### 2.6 Playback Engine
- [ ] Playback speeds: 1x, 2x, 5x, 10x, 50x (scanning)
- [ ] Play/pause/step-forward/step-back controls
- [ ] Time gap compression: auto-skip idle periods >2 min, show "Skipped 2h 15m" interstitial
- [ ] "Wall clock" vs "Activity time" toggle
- [ ] Smart speed: auto-accelerate during repetitive output, decelerate on errors/AI conversations
- [ ] "Highlights only" mode: jump between key events (errors, breakthroughs, commits)

**Edge cases:**
- Seeking backwards: reload terminal snapshot before target, replay forward
- Very fast forward (50x): skip rendering individual terminal events, jump to next significant event
- Playback cursor at session end: show "Session ended" state, offer to restart or go to next session

### 2.7 Annotations System
- [ ] Pause replay at any point to add text annotation
- [ ] Annotation types: "Note", "Breakthrough", "Bug Found", "Key Decision", "WTF Moment"
- [ ] Annotations searchable via FTS5
- [ ] Auto-bookmarks: errors, git commits, AI conversation starts
- [ ] Annotations visible as markers on timeline scrubber

---

## Phase 3: Search + Intelligence

### 3.1 Cross-Session Search
- [ ] Global search bar on recordings dashboard
- [ ] FTS5 search across all sessions: terminal commands, AI conversations, file names, errors, annotations
- [ ] Search results show: session name, timestamp, matched text snippet, event type
- [ ] Click result to open replay at that exact moment

### 3.2 Git Integration
- [ ] Detect `git commit` in terminal output, auto-bookmark with commit hash
- [ ] "What sessions produced this commit?" — query by commit hash
- [ ] Detect `git checkout -b` — mark session segment boundary
- [ ] Link commits back to their session context in the timeline

### 3.3 Session Analytics
- [ ] Per-session stats: time coding vs idle, error frequency, AI usage, files modified
- [ ] Trends over time: productivity patterns, error rates, AI reliance
- [ ] "Session type" auto-detection improvements (already partial in SessionSummaryService)

---

## Phase 4: Sharing + Polish

### 4.1 Export/Import
- [ ] Export as `.coder1-recording` (gzipped tar: manifest.json + events.jsonl.gz + annotations.json + terminal-snapshots/)
- [ ] Deep scrub on export (more aggressive than pre-storage scrub)
- [ ] Anonymize file paths to relative paths (no local machine paths)
- [ ] Import: validate manifest version, schema compatibility, insert into local storage
- [ ] File size limit: warn if export > 100MB

### 4.2 GDPR Compliance
- [ ] "Delete all recordings" button in settings
- [ ] Per-session delete
- [ ] Export-then-delete workflow
- [ ] No server-side/cloud storage in Phase 1 (all local)

### 4.3 UI Polish
- [ ] Keyboard shortcuts: Space (play/pause), Left/Right (step), Shift+Left/Right (skip to bookmark)
- [ ] Session auto-naming enrichment: append most-modified file or git branch after session ends
- [ ] Responsive stacking for smaller screens (not priority — Coder1 is desktop-first)

---

## Architecture Decisions (Rationale)

| Decision | Choice | Why |
|----------|--------|-----|
| Storage | Hybrid SQLite + JSONL | SQLite for index/search, JSONL for crash-safe bulk data. Existing patterns in codebase. |
| Write location | Server-side | Survives browser crashes, enables server-side search. Client ring buffer -> Socket.IO -> server. |
| Terminal replay | xterm.js re-render | 1000x less storage than screenshots. Text selectable and searchable. |
| Write batching | 3s / 200 events | Performance with acceptable ~3s data loss window on crash. |
| Recording trigger | Automatic when flag is on | Reduces friction. No "forgot to hit record" problem. |
| Sharing model | Export-based (Phase 1) | Avoids surveillance concerns. Developer explicitly exports scrubbed file. |
| Secret handling | Pre-storage scrubbing | Secrets never touch disk in cleartext. Over-scrub rather than under-scrub. |
| Dashboard location | New tab on /timeline | Leverages existing navigation, reduces surface area. |
| Replay UI location | Extends Johnny5 replay patterns | 60-70% of UI (TimelineScrubber, playback controls, step visualization) already exists. |

---

## Files to Create (New)

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `lib/flight-recorder/event-collector.ts` | Client-side ring buffer + flush logic | ~150 |
| `lib/flight-recorder/storage.ts` | SQLite + JSONL storage layer | ~300 |
| `lib/flight-recorder/writer.ts` | Server-side event writer | ~200 |
| `lib/flight-recorder/scrubber.ts` | Sensitive data scrubbing | ~150 |
| `lib/flight-recorder/types.ts` | Event types, interfaces | ~80 |
| `lib/hooks/useFlightRecorder.ts` | React hook for recorder state | ~50 |
| `db/migrations/flight-recorder-v1.sql` | SQLite schema | ~60 |
| `app/api/flight-recorder/events/route.ts` | Event ingestion API | ~80 |
| `app/api/flight-recorder/sessions/route.ts` | Session listing API | ~60 |
| `app/api/flight-recorder/sessions/[id]/route.ts` | Session detail + delete | ~80 |
| `app/api/flight-recorder/sessions/[id]/events/route.ts` | Paginated event retrieval | ~80 |
| `components/flight-recorder/RecordingIndicator.tsx` | Status bar recording indicator | ~80 |
| `components/flight-recorder/RecordingsDashboard.tsx` | Recordings tab on /timeline | ~200 |
| `components/flight-recorder/ReplayView.tsx` | Full replay experience | ~400 |
| `components/flight-recorder/TerminalReplay.tsx` | Read-only xterm.js for replay | ~150 |
| `components/flight-recorder/AnnotationEditor.tsx` | Add/edit annotations | ~80 |

**Total new code: ~2,200 lines** (across 16 files)

## Files to Modify (Existing)

| File | Change |
|------|--------|
| `config/feature-flags.ts` | Add FLIGHT_RECORDER flag definition |
| `.env.example` | Add NEXT_PUBLIC_FLIGHT_RECORDER_ENABLED |
| `components/status-bar/StatusBarCore.tsx` | Add RecordingIndicator |
| `components/terminal/Terminal.tsx` | Add event collector hooks for terminal I/O |
| `components/editor/MonacoEditor.tsx` | Add event collector hook for file saves |
| `lib/claude-service.ts` | Add event collector hook for AI interactions |
| `contexts/SessionContext.tsx` | Initialize/teardown flight recorder with session lifecycle |
| `app/timeline/page.tsx` | Add "Recordings" tab |
| `server.js` | Add Socket.IO handler for flight-recorder:events |
| `components/SettingsModal.tsx` | Add Flight Recorder settings section |

---

## Review

_To be filled after implementation._
