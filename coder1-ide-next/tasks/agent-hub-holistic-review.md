# Agent Hub Holistic Code Review (Phases 0-4)

**Reviewer**: Claude Opus 4.6
**Date**: 2026-04-03
**Branch**: `nightagent/2026-04-02`
**Verdict**: **NEEDS FIXES** (2 critical, 2 important)

---

## Critical Issues (must fix before merge)

### 1. Missing `agent_hub_goals` table in DB schema

**File**: `lib/agent-hub/db.ts`

The `initializeSchema()` function creates 4 tables: `agent_hub_agents`, `agent_hub_tasks`, `agent_hub_runs`, `agent_hub_run_log_chunks`. But `lib/agent-hub/goals.ts` reads/writes to `agent_hub_goals`, which is never created. Any call to the goals API will throw a SQLite "no such table" error at runtime.

**Fix**: Add the `CREATE TABLE IF NOT EXISTS agent_hub_goals (...)` statement to `initializeSchema()` in `db.ts` with columns matching what `goals.ts` expects: `id`, `user_id`, `title`, `description`, `owner_id`, `status`, `due_date`, `task_ids`, `progress_percent`, `created_at`, `updated_at`.

---

### 2. `stopAgentRun` called with wrong number of arguments

**File**: `app/api/agent-hub/runs/[id]/stop/route.ts` line 27

```ts
const sent = await stopAgentRun(runId, workspacePath);
```

But the function signature in `lib/agent-hub/bridge-integration.ts` line 84 is:

```ts
export async function stopAgentRun(runId: string, workspacePath: string, userId: string): Promise<boolean>
```

The `userId` parameter is missing. Without it, `getBridgeForUser(undefined)` will always return null, and the stop signal will never be delivered. Every stop attempt will return a 503 error.

**Fix**: Pass `userId` as the third argument:
```ts
const sent = await stopAgentRun(runId, workspacePath, userId);
```

---

## Important Issues (should fix, not blocking)

### 3. `updateRun` does not filter by `userId` in WHERE clause

**File**: `lib/agent-hub/runs.ts` lines 133-138

```ts
const row = db
  .prepare(
    `UPDATE agent_hub_runs SET ${setClauses.join(', ')} WHERE id = ? RETURNING *`
  )
  .get(...(values as Parameters<typeof db.prepare>)) as RunRow | undefined;
```

Unlike `updateAgent`, `updateTask`, and `updateGoal` which all include `AND user_id = ?` in the WHERE clause, `updateRun` only checks `WHERE id = ?`. This means any authenticated user could update any run if they knew the run ID.

The `getRun` function has a relaxed check (allows `'default'` userId), and there's a comment about server.js handlers, but the update function has no userId filtering at all -- not even the relaxed check. This is a cross-tenant data modification vulnerability.

**Fix**: Add `AND user_id = ?` to the WHERE clause in `updateRun`, or at minimum add a `getRun` ownership check before the update in the calling code.

---

### 4. Inconsistent Next.js params access pattern (sync vs async)

Some routes use the newer async params pattern correctly:
- `app/api/agent-hub/agents/[id]/route.ts`: `params: Promise<{ id: string }>` with `await context.params`
- `app/api/agent-hub/tasks/[id]/route.ts`: `params: Promise<{ id: string }>` with `await params`
- `app/api/agent-hub/runs/[id]/stop/route.ts`: `params: Promise<{ id: string }>` with `await params`

But other routes use the old sync pattern:
- `app/api/agent-hub/runs/[id]/route.ts`: `params: { id: string }` with `params.id` (no await)
- `app/api/agent-hub/runs/[id]/approve/route.ts`: `params: { id: string }` with `params.id` (no await)
- `app/api/agent-hub/runs/[id]/reject/route.ts`: `params: { id: string }` with `params.id` (no await)
- `app/api/agent-hub/goals/[id]/route.ts`: `params: { id: string }` with `params.id` (no await)

In Next.js 15+, params is a Promise. The sync pattern may work today via backwards compatibility but will break in future versions. The inconsistency also makes the codebase harder to maintain.

**Fix**: Standardize all routes to use `params: Promise<{ id: string }>` and `await params`.

---

## What Passed Review (Confidence: High)

### Security
- All SQL uses parameterized statements -- no injection vectors found
- No secrets leaked in API responses
- Auth checked first on every route via `getAuthenticatedUserId`
- Goals routes enforce paywall check before any data access on all 5 methods (GET/POST list, GET/PATCH/DELETE by id)
- `bridge-integration.ts` uses `global.bridgeManager` only -- no direct PTY spawning
- `git-tracker.ts` uses `execFileSync('git', [...args])` with array args -- no shell injection
- Input validation present on all POST/PATCH routes with type checks and allowed-value enums
- `workspacePath` validated as absolute path before use
- Telegram notifications gracefully degrade when tokens not set

### Architecture
- No anonymous auth fallback (dev-mode `'default'` user is acceptable for local dev)
- No blocking operations in Socket.IO handlers -- bridge communication is fire-and-forget emit
- Bridge is security boundary -- all execution routed through `global.bridgeManager`
- Optional service loading pattern followed (bridge manager accessed via null-safe getter)
- Feature flag gate works correctly in layout.tsx

### Data Consistency
- All CRUD functions filter by `userId` in WHERE clauses (except `updateRun` noted above)
- JSON arrays (skills, runIds, taskIds, modifiedFiles) consistently `JSON.parse` on read and `JSON.stringify` on write
- DB writes wrapped in try/catch at API boundaries
- Zombie detector uses a transaction for batch updates

### TypeScript
- No `any` types in lib files
- Error handling uses `err instanceof Error` narrowing consistently
- Proper type interfaces for DB rows vs domain objects
- Discriminated union patterns for status fields

### Code Quality
- Clean separation: lib layer (data access) -> API routes (HTTP boundary) -> components (UI)
- Consistent patterns across all 4 entity types (agents, tasks, runs, goals)
- RunApproval component has proper loading states, error handling, and confirmation dialog
- Reject action requires explicit user confirmation (destructive action safety)

---

## Summary

The implementation is well-structured and follows Coder1's security model correctly. The two critical bugs (missing goals table, broken stop endpoint) are straightforward fixes that should take ~15 minutes total. The important issues (updateRun userId, params inconsistency) are lower risk but worth fixing for correctness and maintainability.

After the 2 critical fixes, this is **ready to merge**.
