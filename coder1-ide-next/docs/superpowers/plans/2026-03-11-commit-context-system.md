# Commit Context System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically capture AI session context on every git commit and surface it in a new `/git-log` page, replacing the Time Capsule system entirely.

**Architecture:** `detectGitEvent()` in `server.js` (already parses terminal output) feeds into a new `CommitContextService` singleton. Each detected commit gets an immediate SQLite row (5ms), then async summary generation via Anthropic API. A new `/git-log` page shows git history with AI context badges, updated in real-time via Socket.IO.

**Tech Stack:** TypeScript, better-sqlite3 (sync API), Next.js 14 App Router, Socket.IO, Node.js `child_process` (git log), Anthropic SDK (summary generation)

**Spec:** `docs/superpowers/specs/2026-03-11-commit-context-design.md`

---

## File Map

### Create
| File | Purpose |
|------|---------|
| `db/migrations/004_commit_contexts.sql` | SQL migration (documentation + used by service init) |
| `lib/commit-context-db.ts` | SQLite CRUD: insert, get by SHA, list by branch |
| `services/commit-context-service.ts` | Core: capture(), SummaryQueue, generateSummary(), requeue() |
| `app/api/commit-contexts/route.ts` | GET /api/commit-contexts — list all contexts |
| `app/api/commit-contexts/[sha]/route.ts` | GET/DELETE single commit context |
| `app/api/commit-contexts/[sha]/retry-summary/route.ts` | POST — re-queue failed summary |
| `app/api/git-log/route.ts` | GET /api/git-log — parsed git log for current repo |
| `app/git-log/page.tsx` | Git Log UI page |
| `components/git-log/CommitList.tsx` | Commit list with context badges |
| `components/git-log/CommitContextPanel.tsx` | Slide-in context panel |

### Modify
| File | Change |
|------|--------|
| `server.js` | Wire detectGitEvent → CommitContextService.capture(); remove 3 time_capsule blocks |
| `components/terminal/Terminal.tsx` | Remove time_capsule state, socket handler, and UI render |
| `components/MenuBar.tsx` | Add /git-log link to View menu |

### Delete
| File | Reason |
|------|--------|
| `app/api/time-capsules/route.ts` | Replaced by commit-contexts |
| `app/api/time-capsules/[id]/route.ts` | Replaced |
| `app/api/time-capsules/batch/route.ts` | Replaced |

---

## Chunk 1: Database Foundation

### Task 1: SQL Migration File

**Files:**
- Create: `db/migrations/004_commit_contexts.sql`

- [ ] **Step 1: Create the migration SQL file**

```sql
-- Migration: 004_commit_contexts
-- Adds commit_contexts table for linking git commits to AI session context.
-- Replaces the Time Capsule system (stored in git refs).
-- Run: Applied automatically by CommitContextService on startup via CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS commit_contexts (
  id               TEXT PRIMARY KEY,
  commit_sha       TEXT NOT NULL UNIQUE,
  parent_sha       TEXT,
  branch           TEXT NOT NULL,
  commit_message   TEXT,
  commit_author    TEXT,
  commit_timestamp DATETIME,
  repo_path        TEXT,
  session_id       TEXT,
  checkpoint_id    TEXT,
  session_summary  TEXT,
  summary_status   TEXT NOT NULL DEFAULT 'pending',
  files_changed    TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES context_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_sha ON commit_contexts(commit_sha);
CREATE INDEX IF NOT EXISTS idx_cc_session ON commit_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_cc_branch ON commit_contexts(branch);
CREATE INDEX IF NOT EXISTS idx_cc_created ON commit_contexts(created_at);
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/db/migrations/`
Expected: `004_commit_contexts.sql` is present

- [ ] **Step 3: Commit**

```bash
git add db/migrations/004_commit_contexts.sql
git commit -m "feat(commit-context): add commit_contexts SQLite migration"
```

---

### Task 2: Database Query Layer

**Files:**
- Create: `lib/commit-context-db.ts`
- Test: `scripts/test-commit-context-db.ts`

- [ ] **Step 1: Write the verification test script first**

Create `scripts/test-commit-context-db.ts`:

```typescript
/**
 * Manual verification script for commit-context-db.ts
 * Run: npx tsx scripts/test-commit-context-db.ts
 */
import {
  initCommitContextTable,
  insertCommitContext,
  getCommitContext,
  listCommitContexts,
  updateSummaryStatus,
  getPendingCommits,
} from '../lib/commit-context-db';

async function run() {
  console.log('Testing commit-context-db...');

  // Test 1: Table init (idempotent)
  const db = await initCommitContextTable();
  console.assert(db !== null, 'FAIL: initCommitContextTable returned null');
  console.log('PASS: initCommitContextTable');

  // Test 2: Insert
  const testSha = 'abc' + Date.now().toString(36);
  await insertCommitContext(db, {
    id: `cc_test_${Date.now()}`,
    commit_sha: testSha,
    branch: 'main',
    commit_message: 'test commit',
    summary_status: 'pending',
  });
  console.log('PASS: insertCommitContext');

  // Test 3: Get by SHA
  const row = await getCommitContext(db, testSha);
  console.assert(row?.commit_sha === testSha, 'FAIL: getCommitContext wrong sha');
  console.assert(row?.summary_status === 'pending', 'FAIL: wrong status');
  console.log('PASS: getCommitContext');

  // Test 4: Update status
  await updateSummaryStatus(db, testSha, 'done', 'Test summary text');
  const updated = await getCommitContext(db, testSha);
  console.assert(updated?.summary_status === 'done', 'FAIL: status not updated');
  console.assert(updated?.session_summary === 'Test summary text', 'FAIL: summary not saved');
  console.log('PASS: updateSummaryStatus');

  // Test 5: List
  const list = await listCommitContexts(db, { limit: 10 });
  console.assert(list.length >= 1, 'FAIL: listCommitContexts empty');
  console.log('PASS: listCommitContexts');

  // Test 6: Duplicate insert is ignored
  await insertCommitContext(db, {
    id: `cc_test_dup_${Date.now()}`,
    commit_sha: testSha,
    branch: 'main',
    commit_message: 'duplicate',
    summary_status: 'pending',
  });
  const dupeCheck = await listCommitContexts(db, { limit: 100 });
  const shaCount = dupeCheck.filter(r => r.commit_sha === testSha).length;
  console.assert(shaCount === 1, `FAIL: duplicate row inserted (count=${shaCount})`);
  console.log('PASS: duplicate insert ignored (INSERT OR IGNORE)');

  db.close();
  console.log('\nAll tests passed.');
}

run().catch(err => { console.error('FAIL:', err); process.exit(1); });
```

- [ ] **Step 2: Run test to verify it fails (lib file doesn't exist yet)**

Run: `npx tsx scripts/test-commit-context-db.ts`
Expected: Error — `Cannot find module '../lib/commit-context-db'`

- [ ] **Step 3: Create the DB layer**

Create `lib/commit-context-db.ts`:

```typescript
import { getDatabase, closeDatabaseSafely } from '@/lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface CommitContextRow {
  id: string;
  commit_sha: string;
  parent_sha: string | null;
  branch: string;
  commit_message: string | null;
  commit_author: string | null;
  commit_timestamp: string | null;
  repo_path: string | null;
  session_id: string | null;
  checkpoint_id: string | null;
  session_summary: string | null;
  summary_status: 'pending' | 'generating' | 'done' | 'failed' | 'no_session';
  files_changed: string | null;
  created_at: string;
}

export interface InsertCommitContextParams {
  id: string;
  commit_sha: string;
  parent_sha?: string | null;
  branch: string;
  commit_message?: string | null;
  commit_author?: string | null;
  commit_timestamp?: string | null;
  repo_path?: string | null;
  session_id?: string | null;
  checkpoint_id?: string | null;
  summary_status: 'pending' | 'no_session';
  files_changed?: string | null;
}

/**
 * Runs the commit_contexts migration and returns the open DB handle.
 * Safe to call multiple times (CREATE TABLE IF NOT EXISTS).
 */
export async function initCommitContextTable() {
  const db = await getDatabase();
  const migration = readFileSync(
    join(process.cwd(), 'db', 'migrations', '004_commit_contexts.sql'),
    'utf-8'
  );
  db.exec(migration);
  return db;
}

export async function insertCommitContext(
  db: any,
  params: InsertCommitContextParams
): Promise<void> {
  db.prepare(`
    INSERT OR IGNORE INTO commit_contexts
      (id, commit_sha, parent_sha, branch, commit_message, commit_author,
       commit_timestamp, repo_path, session_id, checkpoint_id, summary_status, files_changed)
    VALUES
      (@id, @commit_sha, @parent_sha, @branch, @commit_message, @commit_author,
       @commit_timestamp, @repo_path, @session_id, @checkpoint_id, @summary_status, @files_changed)
  `).run({
    id: params.id,
    commit_sha: params.commit_sha,
    parent_sha: params.parent_sha ?? null,
    branch: params.branch,
    commit_message: params.commit_message ?? null,
    commit_author: params.commit_author ?? null,
    commit_timestamp: params.commit_timestamp ?? null,
    repo_path: params.repo_path ?? null,
    session_id: params.session_id ?? null,
    checkpoint_id: params.checkpoint_id ?? null,
    summary_status: params.summary_status,
    files_changed: params.files_changed ?? null,
  });
}

export async function getCommitContext(
  db: any,
  sha: string
): Promise<CommitContextRow | null> {
  const row = db.prepare(
    'SELECT * FROM commit_contexts WHERE commit_sha = ?'
  ).get(sha) as CommitContextRow | undefined;
  return row ?? null;
}

export async function listCommitContexts(
  db: any,
  opts: { limit?: number; branch?: string } = {}
): Promise<CommitContextRow[]> {
  const limit = opts.limit ?? 100;
  if (opts.branch) {
    return db.prepare(
      'SELECT * FROM commit_contexts WHERE branch = ? ORDER BY created_at DESC LIMIT ?'
    ).all(opts.branch, limit) as CommitContextRow[];
  }
  return db.prepare(
    'SELECT * FROM commit_contexts ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as CommitContextRow[];
}

export async function updateSummaryStatus(
  db: any,
  sha: string,
  status: CommitContextRow['summary_status'],
  summary?: string | null
): Promise<void> {
  if (summary !== undefined) {
    db.prepare(
      'UPDATE commit_contexts SET summary_status = ?, session_summary = ? WHERE commit_sha = ?'
    ).run(status, summary ?? null, sha);
  } else {
    db.prepare(
      'UPDATE commit_contexts SET summary_status = ? WHERE commit_sha = ?'
    ).run(status, sha);
  }
}

export async function updateFilesChanged(
  db: any,
  sha: string,
  filesChanged: string
): Promise<void> {
  db.prepare(
    'UPDATE commit_contexts SET files_changed = ? WHERE commit_sha = ?'
  ).run(filesChanged, sha);
}

export async function getPendingCommits(db: any): Promise<CommitContextRow[]> {
  return db.prepare(
    "SELECT * FROM commit_contexts WHERE summary_status IN ('pending', 'generating') ORDER BY created_at ASC"
  ).all() as CommitContextRow[];
}

export async function deleteCommitContext(db: any, sha: string): Promise<void> {
  db.prepare('DELETE FROM commit_contexts WHERE commit_sha = ?').run(sha);
}

/** Returns only the sha + summary_status columns — used for badge overlay */
export async function listCommitShas(
  db: any,
  limit = 200
): Promise<Pick<CommitContextRow, 'commit_sha' | 'summary_status'>[]> {
  return db.prepare(
    'SELECT commit_sha, summary_status FROM commit_contexts ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as Pick<CommitContextRow, 'commit_sha' | 'summary_status'>[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/test-commit-context-db.ts`
Expected: `All tests passed.`

- [ ] **Step 5: Commit**

```bash
git add lib/commit-context-db.ts scripts/test-commit-context-db.ts
git commit -m "feat(commit-context): add commit-context-db CRUD layer"
```

---

## Chunk 2: Core Service

### Task 3: CommitContextService

**Files:**
- Create: `services/commit-context-service.ts`
- Test: `scripts/test-commit-context-service.ts`

**Design:**
- Singleton class, initialized once on first `require()`
- `capture()` — sync DB insert (5ms), then dispatches async tasks to SummaryQueue
- `SummaryQueue` — in-memory queue, max 2 concurrent, exponential backoff on failure
- `generateSummary()` — calls Anthropic API directly (server-side, no browser deps)
- `requeue()` — called on server startup to re-queue any `pending` rows

- [ ] **Step 1: Write the test script**

Create `scripts/test-commit-context-service.ts`:

```typescript
/**
 * Manual verification for CommitContextService.capture()
 * Run: npx tsx scripts/test-commit-context-service.ts
 * Note: Set ANTHROPIC_API_KEY in env to test summary generation.
 */
import { commitContextService } from '../services/commit-context-service';

async function run() {
  console.log('Testing CommitContextService...');

  const testSha = 'deadbeef' + Date.now().toString(16).slice(-4);

  // Test 1: capture() returns without throwing
  await commitContextService.capture({
    sha: testSha,
    branch: 'main',
    message: 'test: verify capture works',
    sessionId: null,
    checkpointId: null,
    repoPath: process.cwd(),
  });
  console.log('PASS: capture() completed without error');

  // Test 2: Row exists in DB after capture
  const row = await commitContextService.getForSha(testSha);
  console.assert(row !== null, 'FAIL: row not found after capture');
  console.assert(row?.commit_sha === testSha, 'FAIL: wrong sha');
  console.assert(
    row?.summary_status === 'pending' || row?.summary_status === 'no_session',
    `FAIL: unexpected status: ${row?.summary_status}`
  );
  console.log(`PASS: row exists with status="${row?.summary_status}"`);

  // Test 3: Duplicate capture is a no-op (INSERT OR IGNORE)
  await commitContextService.capture({
    sha: testSha,
    branch: 'main',
    message: 'duplicate capture',
    sessionId: null,
    checkpointId: null,
    repoPath: process.cwd(),
  });
  const list = await commitContextService.listByBranch('main', 100);
  const dupeCount = list.filter(r => r.commit_sha === testSha).length;
  console.assert(dupeCount === 1, `FAIL: duplicate row created (count=${dupeCount})`);
  console.log('PASS: duplicate capture ignored');

  console.log('\nAll CommitContextService tests passed.');
  process.exit(0);
}

run().catch(err => { console.error('FAIL:', err); process.exit(1); });
```

- [ ] **Step 2: Run to verify it fails (service doesn't exist yet)**

Run: `npx tsx scripts/test-commit-context-service.ts`
Expected: Error — `Cannot find module '../services/commit-context-service'`

- [ ] **Step 3: Create CommitContextService**

Create `services/commit-context-service.ts`:

```typescript
/**
 * CommitContextService
 *
 * Captures AI session context at git commit time.
 * Replaces the Time Capsule system.
 *
 * Usage (server.js):
 *   const { commitContextService } = require('./services/commit-context-service');
 *   commitContextService.capture({ sha, branch, message, sessionId, checkpointId, repoPath });
 */

import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  initCommitContextTable,
  insertCommitContext,
  getCommitContext,
  listCommitContexts,
  updateSummaryStatus,
  updateFilesChanged,
  getPendingCommits,
  deleteCommitContext,
  listCommitShas,
  type CommitContextRow,
} from '@/lib/commit-context-db';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface CaptureParams {
  sha: string;
  branch: string;
  message: string;
  sessionId: string | null;
  checkpointId: string | null;
  repoPath: string | null;
}

// ============================================================================
// In-memory summary queue (max 2 concurrent)
// ============================================================================

interface QueueItem {
  sha: string;
  sessionId: string | null;
  repoPath: string | null;
  retryCount: number;
}

const MAX_CONCURRENT = 2;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

class SummaryQueue {
  private queue: QueueItem[] = [];
  private running = 0;

  enqueue(item: QueueItem) {
    this.queue.push(item);
    this.drain();
  }

  private async drain() {
    while (this.running < MAX_CONCURRENT && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;
      this.process(item).finally(() => {
        this.running--;
        this.drain();
      });
    }
  }

  private async process(item: QueueItem) {
    const { sha, sessionId, repoPath, retryCount } = item;
    let db: any = null;
    try {
      db = await initCommitContextTable();
      await updateSummaryStatus(db, sha, 'generating');

      // Fetch git diff for files changed
      if (repoPath) {
        try {
          const filesChanged = await fetchGitFilesDiff(repoPath, sha);
          if (filesChanged) await updateFilesChanged(db, sha, filesChanged);
        } catch {
          // Non-fatal — continue to summary
        }
      }

      const summary = await generateAISummary({ sha, sessionId, db });
      await updateSummaryStatus(db, sha, 'done', summary);

      // Emit socket event if io is available
      emitContextReady(sha);
      console.log(`[CommitContext] Summary generated for ${sha.slice(0, 7)}`);
    } catch (err) {
      console.error(`[CommitContext] Summary failed for ${sha.slice(0, 7)}:`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`[CommitContext] Retrying ${sha.slice(0, 7)} in ${delay}ms (attempt ${retryCount + 1})`);
        setTimeout(() => {
          this.enqueue({ sha, sessionId, repoPath, retryCount: retryCount + 1 });
        }, delay);
      } else {
        if (db) await updateSummaryStatus(db, sha, 'failed');
        console.error(`[CommitContext] Giving up on ${sha.slice(0, 7)} after ${MAX_RETRIES} retries`);
      }
    } finally {
      if (db) {
        try { db.close(); } catch { /* ignore */ }
      }
    }
  }
}

const summaryQueue = new SummaryQueue();

// ============================================================================
// Socket.IO integration (optional — set by server.js after init)
// ============================================================================

let _io: any = null;
export function setSocketIO(io: any) {
  _io = io;
}

function emitContextReady(sha: string) {
  if (_io) {
    try {
      _io.emit('commit:context_ready', { sha });
    } catch {
      /* ignore */
    }
  }
}

// ============================================================================
// Git helpers
// ============================================================================

async function fetchGitFilesDiff(repoPath: string, sha: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `git diff-tree --no-commit-id -r --name-status ${sha}`,
      { cwd: repoPath, timeout: 5000 }
    );
    const files = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [status, ...rest] = line.split('\t');
        return { path: rest.join('\t'), status };
      });
    return JSON.stringify(files);
  } catch {
    return null;
  }
}

// ============================================================================
// AI summary generation
// ============================================================================

async function generateAISummary({
  sha,
  sessionId,
  db,
}: {
  sha: string;
  sessionId: string | null;
  db: any;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  // Get commit metadata
  const row = await getCommitContext(db, sha);
  if (!row) throw new Error(`No row for sha ${sha}`);

  // Build context from available data
  let terminalContext = '';
  if (sessionId) {
    try {
      // Get terminal history from latest checkpoint for this session
      const checkpoint = db.prepare(
        "SELECT terminal_history FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC LIMIT 1"
      ).get(sessionId) as { terminal_history?: string } | undefined;
      if (checkpoint?.terminal_history) {
        // Truncate to last 3000 chars to keep prompt manageable
        const history = checkpoint.terminal_history;
        terminalContext = history.length > 3000
          ? '...' + history.slice(-3000)
          : history;
      }
    } catch {
      // No checkpoint — proceed without terminal context
    }
  }

  const filesContext = row.files_changed
    ? (() => {
        try {
          const files = JSON.parse(row.files_changed) as { path: string; status: string }[];
          return files.map(f => `  ${f.status}  ${f.path}`).join('\n');
        } catch {
          return row.files_changed;
        }
      })()
    : 'Not available';

  const prompt = `You are summarizing what an AI coding assistant was working on when a git commit was made.

Commit: ${sha.slice(0, 7)}
Branch: ${row.branch}
Message: ${row.commit_message || 'No message'}
Files changed:
${filesContext}
${terminalContext ? `\nRecent terminal activity:\n${terminalContext}` : ''}

Write a 2-4 sentence summary of what was being built or fixed in this commit. Focus on the intent and reasoning, not just the file names. Be specific and concrete.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json() as { content: { text: string }[] };
  return data.content[0]?.text?.trim() ?? '';
}

// ============================================================================
// CommitContextService
// ============================================================================

export class CommitContextService {
  private static instance: CommitContextService;

  static getInstance(): CommitContextService {
    if (!CommitContextService.instance) {
      CommitContextService.instance = new CommitContextService();
    }
    return CommitContextService.instance;
  }

  private generateId(): string {
    return `cc_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Called immediately when detectGitEvent() fires.
   * Inserts DB row in ~5ms, dispatches async work.
   */
  async capture(params: CaptureParams): Promise<void> {
    const { sha, branch, message, sessionId, checkpointId, repoPath } = params;

    let db: any = null;
    try {
      db = await initCommitContextTable();
      await insertCommitContext(db, {
        id: this.generateId(),
        commit_sha: sha,
        branch,
        commit_message: message,
        session_id: sessionId,
        checkpoint_id: checkpointId,
        repo_path: repoPath,
        summary_status: sessionId ? 'pending' : 'no_session',
      });
    } finally {
      if (db) {
        try { db.close(); } catch { /* ignore */ }
      }
    }

    // Dispatch async summary only if we have a session
    if (sessionId) {
      summaryQueue.enqueue({ sha, sessionId, repoPath, retryCount: 0 });
    }
  }

  async getForSha(sha: string): Promise<CommitContextRow | null> {
    const db = await initCommitContextTable();
    try {
      return await getCommitContext(db, sha);
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async listByBranch(branch: string, limit = 50): Promise<CommitContextRow[]> {
    const db = await initCommitContextTable();
    try {
      return await listCommitContexts(db, { branch, limit });
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async listAll(limit = 200): Promise<CommitContextRow[]> {
    const db = await initCommitContextTable();
    try {
      return await listCommitContexts(db, { limit });
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async listShas(limit = 200) {
    const db = await initCommitContextTable();
    try {
      return await listCommitShas(db, limit);
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async deleteContext(sha: string): Promise<void> {
    const db = await initCommitContextTable();
    try {
      await deleteCommitContext(db, sha);
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  async retrySummary(sha: string): Promise<void> {
    const db = await initCommitContextTable();
    try {
      const row = await getCommitContext(db, sha);
      if (!row) throw new Error(`No commit context found for sha: ${sha}`);
      await updateSummaryStatus(db, sha, 'pending');
      summaryQueue.enqueue({ sha, sessionId: row.session_id, repoPath: row.repo_path, retryCount: 0 });
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  /**
   * On server startup: re-queue any rows stuck in pending/generating state.
   */
  async requeue(): Promise<void> {
    const db = await initCommitContextTable();
    let pending: CommitContextRow[] = [];
    try {
      pending = await getPendingCommits(db);
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }

    if (pending.length > 0) {
      console.log(`[CommitContext] Requeueing ${pending.length} pending commits on startup`);
      for (const row of pending) {
        if (row.session_id) {
          summaryQueue.enqueue({
            sha: row.commit_sha,
            sessionId: row.session_id,
            repoPath: row.repo_path,
            retryCount: 0,
          });
        }
      }
    }
  }
}

export const commitContextService = CommitContextService.getInstance();
```

- [ ] **Step 4: Run the test**

Run: `npx tsx scripts/test-commit-context-service.ts`
Expected: `All CommitContextService tests passed.`

- [ ] **Step 5: Commit**

```bash
git add services/commit-context-service.ts scripts/test-commit-context-service.ts
git commit -m "feat(commit-context): add CommitContextService with async summary queue"
```

---

## Chunk 3: API Routes

### Task 4: List Commit Contexts API

**Files:**
- Create: `app/api/commit-contexts/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { commitContextService } from '@/services/commit-context-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500);
    const branch = searchParams.get('branch') ?? undefined;

    let contexts;
    if (branch) {
      contexts = await commitContextService.listByBranch(branch, limit);
    } else {
      // Return sha+status only for the badge overlay (lightweight)
      const shaOnly = searchParams.get('shaOnly') === 'true';
      if (shaOnly) {
        const shas = await commitContextService.listShas(limit);
        return NextResponse.json({ contexts: shas });
      }
      contexts = await commitContextService.listAll(limit);
    }

    return NextResponse.json({ contexts });
  } catch (err) {
    console.error('[API] GET /api/commit-contexts error:', err);
    return NextResponse.json({ error: 'Failed to list commit contexts' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify route exists**

Run: `ls app/api/commit-contexts/route.ts`
Expected: file present

- [ ] **Step 3: Commit**

```bash
git add app/api/commit-contexts/route.ts
git commit -m "feat(commit-context): add GET /api/commit-contexts route"
```

---

### Task 5: Single Commit Context API

**Files:**
- Create: `app/api/commit-contexts/[sha]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { commitContextService } from '@/services/commit-context-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { sha: string } }
) {
  const { sha } = params;
  if (!sha || sha.length < 7) {
    return NextResponse.json({ error: 'sha is required' }, { status: 400 });
  }

  try {
    const context = await commitContextService.getForSha(sha);
    if (!context) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ context });
  } catch (err) {
    console.error(`[API] GET /api/commit-contexts/${sha} error:`, err);
    return NextResponse.json({ error: 'Failed to get commit context' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { sha: string } }
) {
  const { sha } = params;
  if (!sha) {
    return NextResponse.json({ error: 'sha is required' }, { status: 400 });
  }

  try {
    await commitContextService.deleteContext(sha);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[API] DELETE /api/commit-contexts/${sha} error:`, err);
    return NextResponse.json({ error: 'Failed to delete commit context' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/commit-contexts/[sha]/route.ts
git commit -m "feat(commit-context): add GET/DELETE /api/commit-contexts/[sha] route"
```

---

### Task 6: Retry Summary API

**Files:**
- Create: `app/api/commit-contexts/[sha]/retry-summary/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { commitContextService } from '@/services/commit-context-service';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { sha: string } }
) {
  const { sha } = params;
  if (!sha) {
    return NextResponse.json({ error: 'sha is required' }, { status: 400 });
  }

  try {
    await commitContextService.retrySummary(sha);
    return NextResponse.json({ success: true, message: 'Summary re-queued' });
  } catch (err: any) {
    if (err?.message?.includes('No commit context found')) {
      return NextResponse.json({ error: 'Commit context not found' }, { status: 404 });
    }
    console.error(`[API] POST /api/commit-contexts/${sha}/retry-summary error:`, err);
    return NextResponse.json({ error: 'Failed to retry summary' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/commit-contexts/[sha]/retry-summary/route.ts
git commit -m "feat(commit-context): add POST /api/commit-contexts/[sha]/retry-summary route"
```

---

### Task 7: Git Log API

**Files:**
- Create: `app/api/git-log/route.ts`

The git log route parses `git log` output and merges in context badge data.

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { commitContextService } from '@/services/commit-context-service';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

interface GitLogEntry {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  message: string;
  contextStatus: 'done' | 'pending' | 'generating' | 'failed' | 'no_session' | 'none';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
  const repoPath = searchParams.get('repoPath') || process.cwd();

  try {
    // Parse git log
    const format = '%H%x1f%an%x1f%ai%x1f%s%x1e';
    const { stdout } = await execAsync(
      `git log --pretty=format:"${format}" -${limit}`,
      { cwd: repoPath, timeout: 10000 }
    );

    const entries: GitLogEntry[] = stdout
      .split('\x1e')
      .map(s => s.trim())
      .filter(Boolean)
      .map(entry => {
        const [sha, author, date, message] = entry.split('\x1f');
        return {
          sha: sha?.trim() ?? '',
          shortSha: (sha?.trim() ?? '').slice(0, 7),
          author: author?.trim() ?? '',
          date: date?.trim() ?? '',
          message: message?.trim() ?? '',
          contextStatus: 'none' as const,
        };
      })
      .filter(e => e.sha.length === 40);

    // Merge context badge data
    const contextShas = await commitContextService.listShas(500);
    const contextMap = new Map(contextShas.map(c => [c.commit_sha, c.summary_status]));

    // Also match short SHAs (7 chars) since detectGitEvent captures short SHAs
    const shortShaMap = new Map(contextShas.map(c => [c.commit_sha.slice(0, 7), c.summary_status]));

    for (const entry of entries) {
      const status = contextMap.get(entry.sha) ?? shortShaMap.get(entry.shortSha);
      if (status) {
        entry.contextStatus = status as GitLogEntry['contextStatus'];
      }
    }

    return NextResponse.json({ entries, total: entries.length });
  } catch (err: any) {
    // Not a git repo or git not installed
    if (err?.message?.includes('not a git repository') || err?.code === 128) {
      return NextResponse.json({ entries: [], total: 0, warning: 'Not a git repository' });
    }
    console.error('[API] GET /api/git-log error:', err);
    return NextResponse.json({ error: 'Failed to parse git log' }, { status: 500 });
  }
}
```

> **Edge case note:** `detectGitEvent()` captures 7-char short SHAs from git output. The full 40-char SHA is looked up in `git log`. The `shortShaMap` provides the cross-reference.

- [ ] **Step 2: Commit**

```bash
git add app/api/git-log/route.ts
git commit -m "feat(commit-context): add GET /api/git-log route with context badge overlay"
```

---

## Chunk 4: Server Wiring + Time Capsule Removal

### Task 8: Wire server.js

**Files:**
- Modify: `server.js` (lines ~1897, ~1947, ~3601 for removal; top of file for service load)

The goal: replace the `time_capsule:commit_detected` emit blocks with `commitContextService.capture()` calls. There are exactly 3 locations where this happens.

- [ ] **Step 1: Add service require at the top of server.js**

Find the section near the top of `server.js` where other services are optionally loaded (look for `try { require(...) } catch { warn; null }` pattern). Add after the last such block:

```javascript
// Commit Context Service — captures AI session context at each git commit
let commitContextService = null;
try {
  const { commitContextService: svc, setSocketIO } = require('./services/commit-context-service');
  commitContextService = svc;
  // Requeue any pending summaries from last run
  svc.requeue().catch(err => console.warn('[CommitContext] Requeue failed:', err));
  console.log('[CommitContext] Service loaded');
  // setSocketIO will be called after `io` is created (see below)
  global.__commitContextSetSocketIO = setSocketIO;
} catch (err) {
  console.warn('[CommitContext] Service unavailable:', err.message);
}
```

Then, after `const io = new Server(...)` is created, add:
```javascript
if (global.__commitContextSetSocketIO) {
  global.__commitContextSetSocketIO(io);
}
```

- [ ] **Step 2: Replace time_capsule block at line ~3601 (PTY local output)**

Find this block (inside the PTY `onData` callback, after `detectGitEvent` call):

```javascript
// Time Capsule: Detect commits during active Claude sessions
if (process.env.NEXT_PUBLIC_TIME_CAPSULES === 'true' && gitEvents.length > 0) {
  const claudeSession = claudeCodeSessions.get(sessionId);
  if (claudeSession && claudeSession.inClaudeSession) {
    for (const event of gitEvents) {
      if (event.type === 'commit') {
        // ... emit time_capsule:commit_detected
      }
    }
  }
}
```

Replace with:

```javascript
// Commit Context: capture every commit regardless of claude session state
if (commitContextService && gitEvents.length > 0) {
  const session = terminalSessions.get(sessionId);
  for (const event of gitEvents) {
    if (event.type === 'commit') {
      const activeSession = session?.currentSessionId || null;
      commitContextService.capture({
        sha: event.sha,
        branch: event.branch,
        message: event.message,
        sessionId: activeSession,
        checkpointId: null,
        repoPath: session?.workingDir || null,
      }).catch(err => console.warn('[CommitContext] capture failed:', err));
    }
  }
}
```

- [ ] **Step 3: Replace time_capsule block at line ~1897 (bridge claude:output)**

Same replacement pattern as Step 2, in the `claude:output` socket handler. Replace the `if (process.env.NEXT_PUBLIC_TIME_CAPSULES === 'true' ...)` block with:

```javascript
// Commit Context: capture via bridge claude:output
if (commitContextService && gitEvents.length > 0) {
  const session = terminalSessions.get(data.sessionId);
  for (const event of gitEvents) {
    if (event.type === 'commit') {
      const activeSession = session?.currentSessionId || null;
      commitContextService.capture({
        sha: event.sha,
        branch: event.branch,
        message: event.message,
        sessionId: activeSession,
        checkpointId: null,
        repoPath: session?.workingDir || null,
      }).catch(err => console.warn('[CommitContext] capture failed:', err));
    }
  }
}
```

- [ ] **Step 4: Replace time_capsule block at line ~1947 (bridge ai:output)**

Same replacement pattern in the `ai:output` socket handler.

- [ ] **Step 5: Search for any remaining time_capsule:commit_detected references**

Run: `grep -n "time_capsule:commit_detected\|NEXT_PUBLIC_TIME_CAPSULES" server.js`
Expected: Zero matches

- [ ] **Step 6: Start dev server and verify no startup errors**

Run: `cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next && npm run dev`
Expected: Server starts on port 3001, log shows `[CommitContext] Service loaded`
Stop server after confirming.

- [ ] **Step 7: Commit**

```bash
git add server.js
git commit -m "feat(commit-context): wire CommitContextService into server.js, remove time_capsule blocks"
```

---

### Task 9: Remove Time Capsule UI from Terminal.tsx

**Files:**
- Modify: `components/terminal/Terminal.tsx`

The time capsule code in Terminal.tsx is feature-gated behind `features().timeCapsules`. There are 4 locations to remove:

1. Line ~54: `const TimeCapsulePrompt = features().timeCapsules ? dynamic(...) : null;`
2. Line ~276: `const [timeCapsuleCommit, setTimeCapsuleCommit] = useState<{...}>(null);`
3. Lines ~4332-4342: `if (features().timeCapsules) { ... socket.on('time_capsule:commit_detected', ...) }`
4. Lines ~5756-5790: `{features().timeCapsules && TimeCapsulePrompt && timeCapsuleCommit && (<TimeCapsulePrompt .../>)}`

- [ ] **Step 1: Remove the TimeCapsulePrompt dynamic import (line ~54)**

Find and remove:
```typescript
const TimeCapsulePrompt = features().timeCapsules
  ? dynamic(() => import('@/components/time-capsules/TimeCapsulePrompt'), { ssr: false })
  : null;
```

- [ ] **Step 2: Remove the timeCapsuleCommit state (line ~276)**

Find and remove:
```typescript
// Time Capsule: Commit data for the save prompt (feature-gated)
const [timeCapsuleCommit, setTimeCapsuleCommit] = useState<{
  sessionId: string;
  sha: string;
  ...
} | null>(null);
```

- [ ] **Step 3: Remove the socket.on handler block (lines ~4332-4342)**

Find and remove:
```typescript
// Time Capsule: Listen for commit detection during active Claude sessions
if (features().timeCapsules) {
  const timeCapsuleHandler = (data: ...) => {
    setTimeCapsuleCommit(data);
  };
  if ((socketHandlersRef.current as any).timeCapsuleCommit) {
    socket.off('time_capsule:commit_detected', ...);
  }
  (socketHandlersRef.current as any).timeCapsuleCommit = timeCapsuleHandler;
  socket.on('time_capsule:commit_detected', timeCapsuleHandler);
}
```

- [ ] **Step 4: Remove the JSX render block (lines ~5756-5790)**

Find and remove:
```typescript
{/* Time Capsule Prompt - Feature-gated inline notification */}
{features().timeCapsules && TimeCapsulePrompt && timeCapsuleCommit && (
  <TimeCapsulePrompt ... />
)}
```

- [ ] **Step 5: Verify no remaining time_capsule references in Terminal.tsx**

Run: `grep -n "time_capsule\|timeCapsule\|TimeCapsule" components/terminal/Terminal.tsx`
Expected: Zero matches

- [ ] **Step 6: Commit**

```bash
git add components/terminal/Terminal.tsx
git commit -m "feat(commit-context): remove Time Capsule UI from Terminal.tsx"
```

---

### Task 10: Delete Time Capsule API Routes

**Files:**
- Delete: `app/api/time-capsules/route.ts`
- Delete: `app/api/time-capsules/[id]/route.ts`
- Delete: `app/api/time-capsules/batch/route.ts`

- [ ] **Step 1: Delete the files**

```bash
rm app/api/time-capsules/route.ts
rm app/api/time-capsules/[id]/route.ts
rm app/api/time-capsules/batch/route.ts
rmdir app/api/time-capsules/[id] 2>/dev/null || true
rmdir app/api/time-capsules 2>/dev/null || true
```

- [ ] **Step 2: Verify directory is gone**

Run: `ls app/api/time-capsules 2>&1`
Expected: `No such file or directory`

- [ ] **Step 3: Check for any remaining imports/references to time-capsule API**

Run: `grep -r "api/time-capsules" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .next`
Expected: Zero matches

- [ ] **Step 4: Commit**

```bash
git add -A app/api/time-capsules
git commit -m "feat(commit-context): delete time-capsules API routes (replaced by commit-contexts)"
```

---

## Chunk 5: Git Log UI

### Task 11: CommitList Component

**Files:**
- Create: `components/git-log/CommitList.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import React from 'react';

export type ContextStatus = 'done' | 'pending' | 'generating' | 'failed' | 'no_session' | 'none';

export interface GitLogEntry {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  message: string;
  contextStatus: ContextStatus;
}

interface CommitListProps {
  entries: GitLogEntry[];
  selectedSha: string | null;
  onSelectCommit: (sha: string) => void;
  loading: boolean;
}

function ContextBadge({ status }: { status: ContextStatus }) {
  if (status === 'none' || status === 'no_session') return null;

  const config: Record<string, { label: string; className: string }> = {
    done: {
      label: 'AI context',
      className: 'bg-green-900/40 text-green-400 border border-green-700/50',
    },
    generating: {
      label: 'generating...',
      className: 'bg-yellow-900/30 text-yellow-500 border border-yellow-700/40 animate-pulse',
    },
    pending: {
      label: 'queued',
      className: 'bg-blue-900/30 text-blue-400 border border-blue-700/40',
    },
    failed: {
      label: 'failed',
      className: 'bg-red-900/30 text-red-400 border border-red-700/40',
    },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ml-2 ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatRelativeDate(isoDate: string): string {
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return isoDate.slice(0, 10);
  }
}

export function CommitList({ entries, selectedSha, onSelectCommit, loading }: CommitListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        Loading git history...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No commits found
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-800">
      {entries.map(entry => (
        <button
          key={entry.sha}
          onClick={() => onSelectCommit(entry.sha)}
          className={`w-full text-left px-4 py-3 hover:bg-gray-800/60 transition-colors ${
            selectedSha === entry.sha ? 'bg-gray-800' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {/* Commit indicator dot */}
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                entry.contextStatus === 'done' ? 'bg-green-400' : 'bg-gray-600'
              }`}
            />
            {/* Short SHA */}
            <code className="text-xs text-[#00D9FF] font-mono">{entry.shortSha}</code>
            {/* Context badge */}
            <ContextBadge status={entry.contextStatus} />
            {/* Date */}
            <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
              {formatRelativeDate(entry.date)}
            </span>
          </div>
          {/* Commit message */}
          <p className="mt-1 text-sm text-gray-300 truncate pl-4">
            {entry.message}
          </p>
          {/* Author */}
          <p className="text-xs text-gray-600 pl-4 mt-0.5">{entry.author}</p>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/git-log/CommitList.tsx
git commit -m "feat(commit-context): add CommitList component with context badges"
```

---

### Task 12: CommitContextPanel Component

**Files:**
- Create: `components/git-log/CommitContextPanel.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { GitLogEntry } from './CommitList';

interface CommitContext {
  id: string;
  commit_sha: string;
  branch: string;
  commit_message: string | null;
  commit_author: string | null;
  commit_timestamp: string | null;
  session_id: string | null;
  session_summary: string | null;
  summary_status: string;
  files_changed: string | null;
  created_at: string;
}

interface CommitContextPanelProps {
  entry: GitLogEntry | null;
  context: CommitContext | null;
  loading: boolean;
  onRetry: () => void;
  onClose: () => void;
}

function FilesList({ filesChangedJson }: { filesChangedJson: string | null }) {
  if (!filesChangedJson) return null;
  try {
    const files = JSON.parse(filesChangedJson) as { path: string; status: string }[];
    if (files.length === 0) return null;
    return (
      <div className="mt-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Files Changed ({files.length})
        </h4>
        <ul className="space-y-1">
          {files.map(f => (
            <li key={f.path} className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`w-4 text-center font-bold ${
                  f.status === 'A' ? 'text-green-400' :
                  f.status === 'D' ? 'text-red-400' :
                  'text-yellow-400'
                }`}
              >
                {f.status}
              </span>
              <span className="text-gray-300 truncate">{f.path}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  } catch {
    return null;
  }
}

export function CommitContextPanel({
  entry,
  context,
  loading,
  onRetry,
  onClose,
}: CommitContextPanelProps) {
  const router = useRouter();

  if (!entry) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Select a commit to view context
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <code className="text-[#00D9FF] font-mono text-sm">{entry.shortSha}</code>
          <span className="text-gray-500 text-xs ml-2">{entry.date.slice(0, 10)}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Commit message */}
        <h3 className="text-white font-medium text-sm mb-1">{entry.message}</h3>
        <p className="text-gray-500 text-xs mb-4">
          {entry.author} &middot; {entry.date.slice(0, 10)}
        </p>

        {loading ? (
          <div className="text-gray-500 text-sm animate-pulse">Loading context...</div>
        ) : context ? (
          <>
            {/* Summary */}
            {context.session_summary && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  AI Context
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {context.session_summary}
                </p>
              </div>
            )}

            {/* Status badges */}
            {context.summary_status === 'generating' && (
              <p className="text-yellow-500 text-xs animate-pulse mb-3">
                Generating summary...
              </p>
            )}
            {context.summary_status === 'failed' && (
              <div className="mb-3">
                <p className="text-red-400 text-xs mb-1">Summary generation failed.</p>
                <button
                  onClick={onRetry}
                  className="text-xs text-[#00D9FF] hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
            {context.summary_status === 'no_session' && (
              <p className="text-gray-500 text-xs mb-3">
                Commit made outside of a Coder1 session — no AI context available.
              </p>
            )}

            {/* Files changed */}
            <FilesList filesChangedJson={context.files_changed} />

            {/* View session link */}
            {context.session_id && (
              <div className="mt-6 pt-4 border-t border-gray-800">
                <button
                  onClick={() => router.push(`/timeline?sessionId=${context.session_id}`)}
                  className="text-xs text-[#00D9FF] hover:underline"
                >
                  View Full Session &rarr;
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            No context captured for this commit.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/git-log/CommitContextPanel.tsx
git commit -m "feat(commit-context): add CommitContextPanel slide-in component"
```

---

### Task 13: Git Log Page

**Files:**
- Create: `app/git-log/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket';
import { CommitList, type GitLogEntry } from '@/components/git-log/CommitList';
import { CommitContextPanel } from '@/components/git-log/CommitContextPanel';

interface CommitContext {
  id: string;
  commit_sha: string;
  branch: string;
  commit_message: string | null;
  commit_author: string | null;
  commit_timestamp: string | null;
  session_id: string | null;
  session_summary: string | null;
  summary_status: string;
  files_changed: string | null;
  created_at: string;
}

export default function GitLogPage() {
  const [entries, setEntries] = useState<GitLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [context, setContext] = useState<CommitContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const socket = useSocket();

  // Load git log
  const loadGitLog = useCallback(async () => {
    try {
      setLogLoading(true);
      const res = await fetch('/api/git-log?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      // Non-fatal
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGitLog();
  }, [loadGitLog]);

  // Real-time badge updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handler = async ({ sha }: { sha: string }) => {
      // Refresh git log to update badge for this sha
      const res = await fetch('/api/git-log?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries ?? []);
      // If this sha is selected, refresh the context panel too
      if (selectedSha && (sha === selectedSha || sha.startsWith(selectedSha.slice(0, 7)))) {
        loadContext(sha);
      }
    };
    socket.on('commit:context_ready', handler);
    return () => { socket.off('commit:context_ready', handler); };
  }, [socket, selectedSha]);

  // Load context for selected commit
  const loadContext = useCallback(async (sha: string) => {
    setContextLoading(true);
    setContext(null);
    try {
      const res = await fetch(`/api/commit-contexts/${sha}`);
      if (res.ok) {
        const data = await res.json();
        setContext(data.context ?? null);
      }
    } finally {
      setContextLoading(false);
    }
  }, []);

  const handleSelectCommit = useCallback((sha: string) => {
    setSelectedSha(sha);
    loadContext(sha);
  }, [loadContext]);

  const handleRetry = useCallback(async () => {
    if (!selectedSha) return;
    await fetch(`/api/commit-contexts/${selectedSha}/retry-summary`, { method: 'POST' });
    // Optimistically update status
    setContext(prev => prev ? { ...prev, summary_status: 'pending' } : null);
  }, [selectedSha]);

  const handleClose = () => {
    setSelectedSha(null);
    setContext(null);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Left panel: commit list */}
      <div className={`flex flex-col border-r border-gray-800 overflow-hidden ${selectedSha ? 'w-96' : 'flex-1'}`}>
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-gray-200">Git History</h1>
          <button
            onClick={loadGitLog}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Refresh
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CommitList
            entries={entries}
            selectedSha={selectedSha}
            onSelectCommit={handleSelectCommit}
            loading={logLoading}
          />
        </div>
      </div>

      {/* Right panel: context */}
      {selectedSha && (
        <div className="flex-1 overflow-hidden">
          <CommitContextPanel
            entry={entries.find(e => e.sha === selectedSha) ?? null}
            context={context}
            loading={contextLoading}
            onRetry={handleRetry}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/git-log/page.tsx
git commit -m "feat(commit-context): add /git-log page with commit list and context panel"
```

---

### Task 14: Add /git-log to Navigation

**Files:**
- Modify: `components/MenuBar.tsx`

- [ ] **Step 1: Add /git-log to the View menu in MenuBar**

In `MenuBar.tsx`, find the `menuConfig` object (or equivalent). Locate the `View` menu array and add a `/git-log` item. Find a pattern like:

```typescript
View: [
  { label: 'Timeline', href: '/timeline' },
  // ...
]
```

Add after the Timeline entry (or equivalent):
```typescript
{ label: 'Git History', href: '/git-log' },
```

If the View menu uses `action` instead of `href`, add:
```typescript
{ label: 'Git History', action: () => router.push('/git-log'), icon: GitBranch },
```

Use whichever pattern the existing View menu items use.

- [ ] **Step 2: Verify navigation renders correctly**

Start dev server: `npm run dev`
Navigate to: `http://localhost:3001`
Open View menu and confirm "Git History" appears.
Click it — should navigate to `http://localhost:3001/git-log`.

- [ ] **Step 3: Commit**

```bash
git add components/MenuBar.tsx
git commit -m "feat(commit-context): add Git History link to View menu"
```

---

## Final Verification

- [ ] **Make a test commit in the Coder1 terminal and verify:**

1. Start dev server: `npm run dev`
2. Open Coder1 IDE at `http://localhost:3001`
3. Open a terminal session
4. Run: `git commit --allow-empty -m "test: commit context system"`
5. Within 5 seconds: check DB for new row

```bash
npx tsx -e "
  const { initCommitContextTable, listCommitContexts } = require('./lib/commit-context-db');
  initCommitContextTable().then(db => {
    listCommitContexts(db, { limit: 5 }).then(rows => {
      console.log(JSON.stringify(rows, null, 2));
      db.close();
    });
  });
"
```

Expected: Row with the commit SHA appears with `summary_status` of `'no_session'` (since no Claude session was active) or `'pending'`/`'done'`.

6. Navigate to `http://localhost:3001/git-log` — commit should appear with a badge.

- [ ] **Run final cleanup check**

```bash
grep -r "time_capsule\|timeCapsule\|TimeCapsule" --include="*.ts" --include="*.tsx" . \
  | grep -v node_modules | grep -v .next | grep -v ".test.ts"
```

Expected: Zero matches in source files.

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat(commit-context): complete Commit Context System — replaces Time Capsule"
```

---

## Edge Cases Covered

| Scenario | Handling |
|----------|----------|
| `git commit --amend` | New SHA → new row. Old row preserved. |
| Commits outside Coder1 | `session_id=null`, `summary_status='no_session'`. No summary generated. |
| Duplicate commit detection | `INSERT OR IGNORE` — second call is silent no-op. |
| Server restart mid-summary | `requeue()` on startup re-queues all `pending` rows. |
| Summary API down | Retry 3x with exponential backoff, then `'failed'` status + UI retry button. |
| Short SHA vs full SHA mismatch | `/api/git-log` cross-references both full SHA map and short SHA map. |
| Git not installed / not a repo | `/api/git-log` returns empty list with `warning` field, no error thrown. |
| No Anthropic API key | `generateAISummary` throws → queue catches → marks `'failed'` after retries. |

---

Plan complete and saved to `docs/superpowers/plans/2026-03-11-commit-context-system.md`. Ready to execute?
