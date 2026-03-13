# Commit Context System — Design Spec

**Date:** 2026-03-11
**Status:** Approved
**Replaces:** Time Capsule system

---

## Problem

When developers use AI agents to make commits, the reasoning behind each change evaporates the moment the terminal closes. Tools like Entire/Checkpoints (recently raised $60M) are solving this by linking AI session context to git commits. Coder1 already has the detection infrastructure — the gap is the storage, summary, and UI layer.

## What We're Building

A **Commit Context System** that:
1. Automatically captures the current session context every time a git commit is made in the Coder1 terminal
2. Generates an AI summary of what was being worked on and why
3. Surfaces this context in a new `/git-log` page showing git history with context badges

Replaces the existing Time Capsule system with a cleaner, unified approach.

---

## Architecture

### Detection (Already Exists)

`detectGitEvent()` in `server.js` (line 727) already extracts `{sha, branch, message}` from terminal output in real-time. Called from three points:
- Line 3611: local PTY output
- Line 1908: bridge `claude:output`
- Line 1958: bridge `direct:output`

No changes needed here. The existing `time_capsule:commit_detected` event is retired.

### New Service: `CommitContextService`

**File:** `services/commit-context-service.ts`

Responsibilities:
- `capture(params)` — records commit to DB immediately (~5ms), dispatches async summary
- `generateSummary(sha, sessionId)` — calls SessionSummaryService, updates DB
- `getForSha(sha)` — returns single commit context
- `listByBranch(branch, limit)` — returns paginated commit contexts
- `requeue()` — on server start, re-queues any `pending` rows

### Database Schema

New table added to SQLite via migration:

```sql
CREATE TABLE commit_contexts (
  id               TEXT PRIMARY KEY,         -- cc_<timestamp>_<hex>
  commit_sha       TEXT NOT NULL UNIQUE,     -- Full 40-char SHA
  parent_sha       TEXT,
  branch           TEXT NOT NULL,
  commit_message   TEXT,
  commit_author    TEXT,
  commit_timestamp DATETIME,
  repo_path        TEXT,
  session_id       TEXT,                     -- Coder1 session at commit time
  checkpoint_id    TEXT,                     -- Latest checkpoint at commit time
  session_summary  TEXT,                     -- AI-generated (async)
  summary_status   TEXT DEFAULT 'pending',   -- pending|generating|done|failed|no_session
  files_changed    TEXT,                     -- JSON: [{path, status, additions, deletions}]
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES context_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_cc_sha ON commit_contexts(commit_sha);
CREATE INDEX idx_cc_session ON commit_contexts(session_id);
CREATE INDEX idx_cc_branch ON commit_contexts(branch);
CREATE INDEX idx_cc_created ON commit_contexts(created_at);
```

### Capture Flow

```
git commit in terminal
  ↓
PTY output → detectGitEvent() → { sha, branch, message }
  ↓
CommitContextService.capture({
  sha, branch, message,
  sessionId,       ← from terminalSessions.get(sessionId)
  checkpointId,    ← latestCheckpointForSession(sessionId)
  repoPath         ← session.workingDir
})
  ↓
[~5ms] INSERT OR IGNORE into commit_contexts (status: 'pending')
  ↓
[async] fetchGitFilesDiff(repoPath, sha) → UPDATE files_changed
[async] SummaryQueue.enqueue(sha, sessionId) → generate + UPDATE
  ↓
socket.emit('commit:context_ready', { sha }) → git-log page updates badge
```

### Async Summary Generation

1. `summary_status = 'generating'`
2. Fetch terminal history from linked checkpoint (if exists)
3. Call `SessionSummaryService.generateContextSummary({ terminalHistory, commitMessage, branch, openFiles })`
4. `UPDATE commit_contexts SET session_summary = result, summary_status = 'done'`
5. Emit `commit:context_ready` via Socket.IO
6. On failure: retry 3x with exponential backoff, then `summary_status = 'failed'`

**Queue:** In-memory async queue, max 2 concurrent. On server restart, re-queue all `pending` rows.

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/commit-contexts` | List all contexts (for badge overlay) |
| GET | `/api/commit-contexts/[sha]` | Single commit context |
| GET | `/api/git-log` | Parsed `git log` for current repo |
| POST | `/api/commit-contexts/[sha]/retry-summary` | Retry failed summary |
| DELETE | `/api/commit-contexts/[sha]` | Remove context |

### Git Log UI (`/git-log`)

**Layout:** Uses existing `ThreePanelLayout`. Left panel = commit list. Right panel = context slide-in.

**Commit list entry:**
```
● a3f8d91  feat: payment handler refactor  [AI context ✓]  2h ago
○ 59f28fa  test: add e2e tests                              3h ago
● c8d69b56  feat: UI polish                [generating...]  4h ago
```

**Context panel (opens on click):**
- Commit SHA, branch, author, timestamp
- Session summary (the primary content)
- Files changed list (from `files_changed` JSON)
- "View Full Session" button → links to `/timeline?sessionId=<id>`

**Real-time:** Socket.IO subscription updates badges as summaries complete.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| `git commit --amend` | SHA changes → new row. Old row remains (historical). No special treatment. |
| `git merge` auto-commit | Detected normally. Gets context. |
| `git rebase` | New SHAs → old contexts orphaned but preserved. No active cleanup. |
| `git commit --no-verify` | Terminal output still captured. No special handling. |
| Commits outside Coder1 | `session_id=null`, `summary_status='no_session'`. Git metadata stored via bridge watcher's 60s polling. |
| Duplicate detection | `INSERT OR IGNORE` on `commit_sha`. |
| Server restart mid-summary | `pending` rows re-queued on startup. |
| Large repos | Git log page loads last 100 commits, paginates. |
| Summary generation fails | Retry 3x, then `'failed'` status with UI retry button. |

---

## Time Capsule Retirement

**Remove:**
- `time_capsule:commit_detected` prompt UI from `Terminal.tsx`
- `app/api/time-capsules/route.ts`

**Repurpose:**
- `bridge-cli/src/time-capsule-handler.js` → emit `commit:detected` to server instead of writing to git refs

**No migration** of existing Time Capsule data (stored in git refs, complex to read back, low value).

---

## Files to Create

| File | Purpose |
|------|---------|
| `services/commit-context-service.ts` | Core service (capture, summarize, query) |
| `lib/commit-context-db.ts` | SQLite queries for commit_contexts table |
| `app/api/commit-contexts/route.ts` | List/query API |
| `app/api/commit-contexts/[sha]/route.ts` | Single commit API |
| `app/api/git-log/route.ts` | Git log parser API |
| `app/git-log/page.tsx` | Git Log UI page |
| `components/git-log/CommitList.tsx` | Commit list component |
| `components/git-log/CommitContextPanel.tsx` | Slide-in context panel |
| `db/migrations/004_commit_contexts.sql` | DB migration |

## Files to Modify

| File | Change |
|------|--------|
| `server.js` | Wire commit detection → CommitContextService.capture() |
| `Terminal.tsx` | Remove time_capsule prompt UI |
| `app/layout.tsx` | Add /git-log to navigation |
| `lib/johnny5-db.ts` | Add commit_contexts migration |

## Files to Remove

| File | Reason |
|------|--------|
| `app/api/time-capsules/route.ts` | Replaced |

---

## Success Criteria

- Every git commit made in Coder1 terminal results in a row in `commit_contexts` within 5 seconds
- Session summaries generate within 30 seconds of commit (when Claude API available)
- `/git-log` shows context badges in real-time as summaries complete
- Zero user action required — fully automatic
- Commit outside IDE still captured (metadata only, no summary)
- Time Capsule system fully removed with no regression in terminal behavior
