# Phase 6 Code Quality Review

**Reviewer**: Claude Opus 4.6 (automated)
**Date**: 2026-04-03
**Branch**: nightagent/2026-04-02
**Files reviewed**: 19

---

## CODE QUALITY: APPROVED_WITH_ISSUES

---

## Critical Issues

### 1. CRITICAL - Internal token leaked into Claude session prompt (unredacted)

**File**: `lib/agent-hub/bridge-integration.ts` lines 72-88

The `AGENT_HUB_INTERNAL_TOKEN` is injected directly into the supervisor prompt sent to Claude via `buildSupervisorSection()`. This prompt is then emitted over the bridge socket (`agent:start` event) and will appear in run log chunks stored in `agent_hub_run_log_chunks`. The spec requires this token to be redacted with `[REDACTED]` in stored logs, but there is **no redaction happening anywhere** in the log storage path.

The token is a raw plaintext secret in:
- The prompt sent to the bridge socket
- Any `agent:output` log chunks captured from Claude's session
- The `content` column of `agent_hub_run_log_chunks`

**Fix**: Either (a) redact the token in `appendRunLogChunk()` before persisting, or (b) never put the real token in the prompt and instead have the bridge inject it at execution time.

### 2. CRITICAL - Scheduler race condition: same task can fire twice

**File**: `app/api/cron/scheduled-tasks/route.ts`

The scheduler reads all due tasks, then iterates and fires them sequentially. If the cron endpoint is hit twice concurrently (e.g., overlapping cron invocations), both requests will read the same `next_run_at <= now` rows and both will fire runs for the same task. There is no locking or atomic "claim" mechanism.

**Fix**: Use an atomic UPDATE with a WHERE clause to claim tasks:
```sql
UPDATE agent_hub_tasks
SET next_run_at = ?  -- new computed value
WHERE id = ? AND next_run_at = ?  -- old value acts as optimistic lock
```
Only proceed if `changes > 0`.

### 3. CRITICAL - Approve route: run status updated even if merge fails partially

**File**: `app/api/agent-hub/runs/[id]/approve/route.ts` lines 55-59

If `mergeWorktreeBranch` succeeds but `removeWorktree` throws, the error is caught and a 500 is returned, but the run's status is NOT updated (which is correct). However, the merge has already been committed to the main branch. On retry, `mergeWorktreeBranch` will attempt the merge again on an already-merged branch, likely causing errors or duplicate commits.

**Fix**: After a successful merge, update the run status to 'approved' BEFORE attempting worktree cleanup. Worktree cleanup failure should be logged but not block the approval.

---

## Important Issues

### 4. IMPORTANT - `computeNextRunAt` weekly: double-advance possible

**File**: `lib/agent-hub/tasks.ts` lines 230-240

The weekly scheduler computes `daysUntilTarget`, adds them, then checks `if (next <= now) next.setUTCDate(next.getUTCDate() + 7)`. But when `daysUntilTarget === 0 && next <= now`, the code already adds 7 via the `daysUntilTarget += 7` branch. The subsequent `if (next <= now)` check could theoretically add another 7 days. In practice this is unlikely (would require the addition to exactly equal `now`), but the redundant check is a correctness smell.

**Fix**: Remove the trailing `if (next <= now)` guard for the weekly case, since the `daysUntilTarget` logic already handles the same-day-past-time case.

### 5. IMPORTANT - `removeWorktree` derives repo root via heuristic path parsing

**File**: `lib/agent-hub/git-tracker.ts` lines 137-156

The function reads the `.git` file, regex-matches `gitdir:`, then walks up three parent directories to find the repo root. This is fragile -- if the git internal layout changes or if the worktree was created in a non-standard way, the path derivation will fail silently and fall through to `fs.rmSync`, which deletes the directory but leaves the git worktree metadata dangling.

**Fix**: Store the original `workspacePath` (the main repo) alongside the `worktreePath` in the run record, so `removeWorktree` can always call `git worktree remove` from the correct repo root without guessing.

### 6. IMPORTANT - No foreign key constraints in schema

**File**: `lib/agent-hub/db.ts`

`PRAGMA foreign_keys = ON` is set, but no `REFERENCES` clauses exist in the schema. `agent_hub_tasks.agent_id` does not reference `agent_hub_agents.id`, `agent_hub_runs.agent_id`/`task_id` have no FK constraints, etc. This means orphaned rows can accumulate if an agent is deleted.

**Fix**: Add `REFERENCES` clauses to the schema. Since `CREATE TABLE IF NOT EXISTS` won't alter existing tables, a migration strategy is needed for existing databases.

### 7. IMPORTANT - `updateAgent` dynamic SET clause: column names from code, not user input (safe but fragile)

**File**: `lib/agent-hub/agents.ts` lines 138-168

The `fieldMap` keys are hardcoded, so column names in the SET clause come from trusted code -- this is **not** SQL injection. However, the pattern of string-interpolating `${dbCol}` into SQL is a maintenance risk. If a future contributor adds a user-derived key to `fieldMap`, it becomes injectable.

**Fix**: No urgent action needed, but consider adding a comment or assertion that `dbCol` values are trusted constants.

### 8. IMPORTANT - `handleStop` in TaskDetail uses void return without error handling

**File**: `components/agent-hub/tasks/TaskDetail.tsx` line 76

`handleStop` calls `fetch` but doesn't check `res.ok`. If the stop fails, the user gets no feedback.

**Fix**: Check `res.ok` and show an error message.

### 9. IMPORTANT - Scheduler updates task `runIds` with `[run.id]` (overwrites history)

**File**: `app/api/cron/scheduled-tasks/route.ts` line 141

```typescript
runIds: [run.id],
```

This replaces the entire `runIds` array with only the new run. Previous run IDs are lost.

**Fix**: Read the current task's `runIds` first and append: `runIds: [...existingRunIds, run.id]`.

---

## Minor Issues

### 10. MINOR - `async` functions in `git-tracker.ts` that are synchronous

**File**: `lib/agent-hub/git-tracker.ts`

Functions like `getDiffForWorkspace`, `captureFinalDiff`, `getChangedFiles`, `createWorktreeForRun`, `removeWorktree`, `mergeWorktreeBranch` are all declared `async` but use `execFileSync` (synchronous). They return `Promise<T>` but never actually `await` anything (except `removeWorktree` in the zombie detector loop).

**Fix**: Either make them truly async using `execFile` with promisify, or remove the `async` keyword and return plain values. The current hybrid is misleading.

### 11. MINOR - `AgentHierarchy` re-filters children on every render for every node

**File**: `components/agent-hub/agents/AgentHierarchy.tsx` line 28

Each `AgentNode` calls `agents.filter(...)` which is O(n) per node, making the full tree O(n^2). Fine for small agent counts (<100) but could be optimized with a pre-built children map.

### 12. MINOR - `getRun` userId check is asymmetric with other functions

**File**: `lib/agent-hub/runs.ts` lines 95-104

`getRun` has a special case: `if (row.user_id !== userId && userId !== 'default') return null`. The comment says this is intentional for server.js handlers, but the `'default'` magic string is a code smell. Other data access functions (getAgent, getTask) don't have this pattern.

**Fix**: Consider a separate `getRunInternal(id)` function without auth checks for server-side use, rather than a magic userId.

### 13. MINOR - No input length limits on text fields

**Files**: `app/api/agent-hub/internal/create-task/route.ts`, `app/api/agent-hub/agents/[id]/route.ts`

Title, description, and systemPrompt have no max length validation. A malicious or buggy client could send megabytes of text.

### 14. MINOR - `handleToggleSchedule` in TaskDetail doesn't check `res.ok`

**File**: `components/agent-hub/tasks/TaskDetail.tsx` line 60

Same pattern as issue #8 -- silent failure on network error.

### 15. MINOR - Inconsistent auth header format between scheduler and internal API

- Scheduler (`/api/cron/scheduled-tasks`): uses `Authorization: Bearer <token>`
- Internal API (`/api/agent-hub/internal/create-task`): uses `X-Internal-Token: <token>`

Both use the same `AGENT_HUB_INTERNAL_TOKEN` env var but different header formats. This is confusing.

### 16. MINOR - `void workspacePath` in `findBridgeSocketForWorkspace`

**File**: `lib/agent-hub/bridge-integration.ts` line 166

The `void workspacePath` statement suppresses the unused-variable warning but the parameter should either be used or the function signature should be updated to not accept it (with a TODO).

---

## Strengths

1. **Parameterized queries throughout**: All SQL queries use `?` placeholders via `better-sqlite3` prepared statements. No string concatenation of user input into SQL. This is solid.

2. **Path validation with `assertAbsolutePath`**: The `git-tracker.ts` consistently validates workspace paths are absolute before any filesystem operations, preventing path traversal attacks via relative paths.

3. **Good error boundaries in API routes**: Each route handler wraps its logic in try/catch, returns structured JSON errors with appropriate HTTP status codes, and never leaks internal paths or stack traces to the client.

4. **Cycle detection with bounded traversal**: `isSupervisorCyclic` uses `MAX_HOPS = 20` to prevent infinite loops, and the hierarchy component uses `MAX_DEPTH = 10`. Both are reasonable safeguards.

5. **Clean separation of concerns**: The codebase maintains clear layers -- db.ts (schema), agents/tasks/runs.ts (data access), git-tracker.ts (git operations), bridge-integration.ts (bridge comms), and API routes (HTTP handlers). Each file has a focused responsibility.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3     |
| Important | 6   |
| Minor    | 7     |

**The three critical issues must be addressed before shipping:**

1. Token in supervisor prompt is stored unredacted in run logs -- security violation
2. Scheduler has no locking -- race condition can double-fire tasks
3. Approve route doesn't handle partial merge+cleanup failure correctly

The important and minor issues are real but non-blocking for an alpha/beta release.
