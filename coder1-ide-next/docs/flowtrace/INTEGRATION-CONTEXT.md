# FlowTrace — Integration Context for the Building Agent

Read this before writing any code. It captures architectural decisions already made and
existing systems you must integrate with rather than rebuild.

---

## 1. The Commit Context System (already built — use it)

A new system was just shipped that captures AI session context at every git commit.
It lives alongside the checkpoint system and is a primary data source for FlowTrace.

### Schema (`db/context-memory.db`, table: `commit_contexts`)

```
id              TEXT  PK
commit_sha      TEXT  UNIQUE
branch          TEXT
commit_message  TEXT
session_id      TEXT  — FK to Coder1 session (join key to checkpoints table)
checkpoint_id   TEXT
session_summary TEXT  — AI-generated 2-4 sentence summary (Haiku)
summary_status  TEXT  — 'pending' | 'generating' | 'done' | 'failed' | 'no_session'
files_changed   TEXT  — JSON array: [{path, status}]
repo_path       TEXT
created_at      TEXT
```

### Key files

| File | Purpose |
|------|---------|
| `lib/commit-context-db.ts` | CRUD layer — import functions directly |
| `services/commit-context-service.ts` | Singleton service — `commitContextService.getForSha()`, `listAll()`, etc. |
| `app/api/commit-contexts/route.ts` | REST: list all contexts |
| `app/api/commit-contexts/[sha]/route.ts` | REST: GET/DELETE by SHA |
| `app/api/git-log/route.ts` | Git log with context badge overlay |
| `components/git-log/CommitList.tsx` | Commit list UI with status badges |
| `components/git-log/CommitContextPanel.tsx` | Detail panel — **primary integration target** |
| `app/git-log/page.tsx` | `/git-log` route |

### How it works

1. `detectGitEvent()` in `server.js` fires on every commit in any terminal
2. `commitContextService.capture()` inserts a DB row in ~5ms
3. Async queue generates Haiku summary using terminal history from the checkpoint
4. `commit:context_ready` Socket.IO event fires when done → UI badge updates

---

## 2. The session_id → Screenpipe timestamp join (the critical plumbing)

**The problem:** commit_contexts stores a Coder1 `session_id`. Screenpipe stores frames
by UNIX timestamp. These need to be joined to show "what was on screen during this session."

**How to resolve it:**

```sql
-- 1. Get the session time window from the checkpoints table
SELECT MIN(created_at) as session_start, MAX(created_at) as session_end
FROM checkpoints
WHERE session_id = ?

-- 2. Then query Screenpipe REST API with that time window:
-- GET localhost:3030/search?start_time=<ISO>&end_time=<ISO>&limit=20&content_type=ocr
```

**Where to wire this:** `CommitContextPanel.tsx` already shows the commit detail. Add a
`useEffect` that fetches Screenpipe frames filtered to the session time window and renders
2-3 thumbnail screenshots inline below the AI summary. This is the visual commit annotation
feature — screenshots of the code being written alongside the text summary.

**Also enhance `generateAISummary()` in `services/commit-context-service.ts`:** It currently
uses only terminal history from the checkpoint. You can optionally pass OCR text from
Screenpipe frames in that time window as additional context. The summary quality improves
significantly because the model sees what was on screen — browser tabs, docs, error messages.

---

## 3. Architecture decisions already locked in

These are not open questions. Do not reopen them.

| Decision | Answer | Reason |
|----------|--------|--------|
| Gemini key | User's own key — never shared | Shared key means FlowTrace pays per user at scale; local-first story requires user ownership |
| sqlite-vec fallback | Launch feature (not v2) | Privacy-focused early adopters demand fully local option on day 1 |
| Screenpipe bundling | Require separate install — detect + guide | Separate release cadence; bundling means owning their bugs; many Coder1 users already have it |
| First CTA timing | Fire after first capture session ends (not after 24 hours) | Dopamine hit must be immediate — 30 min of coding is enough data for a meaningful summary |

---

## 4. Existing infrastructure — do not rebuild

### Screenpipe (port 3030)
- REST API: `localhost:3030/search?q=&start_time=&end_time=&limit=&content_type=ocr`
- Health check: `localhost:3030/health`
- TypeScript SDK: `@screenpipe/js` with `pipe.streamVision(true)` for real-time events
- Frames stored at `~/.screenpipe/frames/` — store paths in Pinecone metadata, never image bytes

### Ambient Daemon
- SQLite at `~/.coder1-ambient/ambient.db`
- Table `activity_sessions`: `(id, app, category, summary, start_time, end_time)`
- Use `ambient_session_id` as metadata in Pinecone vectors — it provides human-readable
  work labels ("writing auth code", "debugging terminal") that enrich query results

### Existing checkpoints table
- `checkpoints` in `context-memory.db`: `(session_id, terminal_history, created_at, ...)`
- This is how you resolve `session_id → time window` (see section 2 above)
- `terminal_history` is the richest text signal — combine with Screenpipe OCR for embeddings

### Existing embeddings (replace, don't augment)
- Currently: OpenAI `text-embedding-3-small`, in-memory, lost on restart
- Replace with: Gemini Embedding 2 + Pinecone (persistent)
- `GEMINI_API_KEY` is already in `.env.local.example`

---

## 5. Server.js service loading pattern (follow exactly)

All services in `server.js` follow this pattern. FlowTrace capture service must too:

```javascript
let flowtraceService = null;
try {
  const { flowtraceService: svc } = require('./services/flowtrace/capture-service');
  flowtraceService = svc;
  console.log('[FlowTrace] Service loaded');
} catch (err) {
  console.warn('[FlowTrace] Service unavailable:', err.message);
}
```

Server must start successfully even if FlowTrace is unavailable. Feature-gate everything
behind `FLOWTRACE_ENABLED=true` env var (default off — explicit opt-in only).

---

## 6. The highest-value integration to ship first

Before the full FlowTrace query panel, ship this one thing inside `CommitContextPanel.tsx`:

> "When a commit has a session_id, fetch 2-3 Screenpipe thumbnails from that session's
> time window and display them below the AI summary."

This requires:
1. A small API route: `app/api/flowtrace/frames-for-session/route.ts`
   - Input: `session_id`
   - Logic: resolve time window from checkpoints, query Screenpipe, return frame metadata
2. A `<ScreenshotStrip>` sub-component in `CommitContextPanel.tsx`
3. No Pinecone, no Gemini, no embedding — just Screenpipe REST queries

This single feature makes `/git-log` genuinely compelling and proves the concept before
the full pipeline is built.

---

## 7. The ErrorDoctor integration (aha moment)

`components/terminal/ErrorDoctor.tsx` already surfaces errors to users. When it fires:

1. Query FlowTrace (and/or commit_contexts) for semantically similar past errors
2. If match found: show "You've seen this before (Mar 9, commit `a4b2c3d`). [See how you fixed it]"
3. Link goes to `/git-log` with that SHA pre-selected, context panel open

This fires at maximum emotional value — user immediately understands why FlowTrace exists.
Wire this in Phase 4 (after core pipeline is working), not before.
