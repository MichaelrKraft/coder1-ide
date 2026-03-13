# Terminal Claude Code Formatting Fix (Mar 12, 2026)

## Completed Fixes

- [x] Fix 1: Consolidate status line writes into single atomic write (Terminal.tsx line 3997)
- [x] Fix 3: Add resize validation bounds (server.js line 4641)
- [x] Fix 4: Disable status line during active Claude sessions (Terminal.tsx line 3964)
- [x] Fix 5: Clear screen before Claude TUI renders (server.js line 2043) - DIDN'T WORK (race condition)
- [x] Fix A: Emit clear screen BEFORE onData handler in bridge (claude-executor.js line 386)
- [x] Fix B: Suppress local PTY output during Claude session (server.js lines 3546, 4137, 2103, 4010)
- [x] **Fix C: Forward clear screen via onData callback** (claude-executor.js line 388) - THE ACTUAL FIX
- [ ] Fix 2: RAF cleanup - SKIPPED (existing code already handles this correctly)
- [ ] Verify fixes work in production

## Changes Made (Mar 12, 2026 - Third Attempt / ACTUAL FIX)

**Root Cause Found**: The clear screen in claude-executor.js was emitted via `this.emit('data',...)` which only goes to bridge-client's debug logger. It NEVER called `options.onData()` which is what actually forwards data to the server!

| File | Fix | Change |
|------|-----|--------|
| `bridge-cli/src/claude-executor.js` | C | **Call `options.onData(clearScreen)` before emitting** - this forwards the clear screen to the server via Socket.IO |

## Changes Made (Mar 12, 2026 - Second Attempt)

| File | Fix | Change |
|------|-----|--------|
| `bridge-cli/src/claude-executor.js` | A | Emit clear screen (`\x1b[2J\x1b[H`) BEFORE onData handler is attached, fixing race condition |
| `server.js` | B | Added `session.suppressOutput` flag check in PTY data handler (line 3546) |
| `server.js` | B | Set `session.suppressOutput = true` when routing claude command to bridge (line 4137) |
| `server.js` | B | Clear flag in `claude:interactive:ended` handler (line 2103) |
| `server.js` | B | Clear flag when bridge disconnects unexpectedly (line 4010) |
| `server.js` | B | Changed line clear (`\r\x1b[K`) to full screen clear (`\x1b[2J\x1b[H`) when starting Claude |

## Root Cause Analysis

**3-agent investigation revealed TWO root causes:**

1. **Race Condition**: The `claude:interactive:started` event fired AFTER the onData handler was attached, so Claude's output could arrive before the clear screen.

2. **Local PTY Mixing**: The local bash PTY continued outputting its prompt (`bash-3.2$`) which mixed with Claude's output from the bridge.

## Previous Fixes (Keep)

| File | Fix | Change |
|------|-----|--------|
| `components/terminal/Terminal.tsx` | 1, 4 | Consolidated 5 `term.write()` calls into single atomic write; Added `!claudeActive` check |
| `server.js` | 3 | Added bounds validation for resize (cols: 20-500, rows: 5-200); Applied to bridge + local + spectator |

---

# Phase 0: Foundation + Security — COMPLETE

## Step 0.1: Fix validateAuth [DONE]
- `lib/api-middleware.ts` — Rewrote `validateAuth` to use real JWT `verifyAccessToken()`. Removed `coder1-alpha-` prefix backdoor and `isValidSessionToken` (accepted any 20+ char string with hyphen). Kept `CODER1_ALPHA_TOKEN` env var as admin bypass.
- `app/api/auth/session/route.ts` — Updated `createSession` to issue real JWTs via `generateTokens()`. Updated `verifySession` and `refreshSession` to use JWT functions. Set proper httpOnly cookies for access (15min) and refresh (7d) tokens.

## Step 0.2: Fix JWT Secret Enforcement [DONE]
- `instrumentation.ts` — Added startup-time validation. Server crashes immediately if `JWT_SECRET` or `JWT_REFRESH_SECRET` are missing in production. Guarded by `NEXT_RUNTIME === 'nodejs'` so it doesn't crash `next build`.

## Step 0.3: Wire Frontend to Token Refresh [ALREADY DONE]
- `lib/hooks/useAuth.ts` already has 13-minute refresh timer, visibility change handler, and auto-redirect on failure. No changes needed.

## Step 0.4: Fix Unauthenticated Session Access [DONE]
- `app/api/sessions/route.ts` — Added `getAuthenticatedUserId()` helper. All handlers (GET/POST/DELETE) require JWT auth. GET filters by userId. POST extracts userId from JWT (ignores body). DELETE verifies ownership before allowing deletion.

## Step 0.5: Add Rate Limiting [DONE]
- `app/api/johnny5/chat/route.ts` — Added `rateLimiters.ai` (10 req/min per IP). Returns 429 when exceeded. 3 lines.

## Step 0.6: Fix Premium Gating [DONE]
- `lib/auth/extract-user-id.ts` — Added `extractSubscriptionTier()` and `hasPremiumAccess()` for server-side premium gating. Checks `subscriptionTier` from JWT claims.
- `app/api/johnny5/supervision-facts/route.ts` — Applied premium check. Returns 403 with `requiresPremium: true` for non-premium users.

## Step 0.7: Fix Prompt Injection [DONE]
- `app/api/johnny5/chat/route.ts` — Created `buildSafePrompt()` with XML boundary tags (`<memory_context>` / `<user_message>`). Applied to all 6 injection points. Updated truncation logic to use new markers.

## Step 0.8: Purge Hardcoded Developer Paths [DONE]
- 31 instances of `/Users/michaelkraft/autonomous_vibe_interface` removed across 31 files
- Server-side: `process.env.PROJECT_PATH || process.cwd()`
- Client-side: `''` or `process.env.NEXT_PUBLIC_PROJECT_PATH || ''`
- Verified: `grep -r "/Users/michaelkraft" --include="*.ts" --include="*.js"` returns zero results

## Step 0.9: Remove Sensitive Console.logs [DONE]
- `services/johnny5/j5-bridge.ts` — Removed auth token preview logging (was logging token availability, length, and first 8 chars)
- `app/api/claude-bridge/spawn/route.ts` — Removed partial OAuth token from error log

---

# Fix 4 Crash-Level Socket/Connection Issues

## Fix 1: Event listener leak in `lib/socket.ts` [DONE]
- [x] Added `visibilityListenerAdded` guard flag to prevent duplicate listeners
- [x] Stored handler reference in `visibilityHandler`; `disconnectSocket()` calls `removeEventListener`

## Fix 2: Infinite reconnection in `lib/socket.ts` [DONE]
- [x] Changed `reconnectionAttempts: Infinity` to `reconnectionAttempts: 25`

## Fix 3: Heartbeat interval leak in `lib/socket.ts` [DONE]
- [x] Added `moduleHeartbeatInterval` at module scope, synced from local `heartbeatInterval`
- [x] `disconnectSocket()` clears interval; `stopHeartbeat()` also clears both

## Fix 4: Session race condition in `contexts/SessionContext.tsx` [DONE]
- [x] Replaced boolean `isCreatingSession` ref with Promise-based `sessionMutexPromise`
- [x] Subsequent callers `await` the in-flight promise instead of silently returning

## Verification [DONE]
- [x] `npx tsc --noEmit 2>&1 | grep "socket\|SessionContext"` -- zero errors

---

# Fix Memory and Cache Issues in shared-memory-service.ts

## Fix 1: Unbounded memory cache eviction [DONE]
- [x] Added eviction in `store()`: when memoryCache exceeds 1000 entries, deletes oldest 200
- [x] No npm packages needed (lru-cache not in package.json)

## Fix 2: Blocking maintenance cycle [DONE]
- [x] Replaced `forEach` with `for...of` loop in `performMaintenance()`
- [x] Added `await new Promise(resolve => setTimeout(resolve, 0))` yield every 50 iterations in both scan and deletion loops

## Fix 3: contextDatabase commented out [DONE]
- [x] Replaced commented-out static import with dynamic `import()` guarded by `typeof window === 'undefined'`
- [x] Added null checks at all 4 contextDatabase usage sites (initializeService, store, loadRecentMemory)
- [x] Falls back gracefully: logs warning and continues with in-memory cache only

## Verification [DONE]
- [x] `npx tsc --noEmit 2>&1 | grep "shared-memory"` returned zero errors

---

# Enterprise Data Collection Services

## Task 1: Create `lib/audit-service.ts` [DONE]
- [x] Add migration to add `user_id` column to `audit_log` table
- [x] Export `logAuditEvent(userId, action, resource?, details?)`
- [x] Export `getAuditLogs(filters)` with pagination
- [x] Export `exportAuditLogsCSV(filters)` returning CSV string
- [x] Keep under 150 lines (126 lines)

## Task 2: Create `lib/token-attribution-service.ts` [DONE]
- [x] Create `token_usage` table in SQLite
- [x] Export `trackTokenUsage(data)` with cost calculation
- [x] Export `getUserTokenUsage(userId, startDate?, endDate?)` aggregated
- [x] Export `getTeamTokenUsage(startDate?, endDate?)` aggregated
- [x] Hardcoded pricing for Claude Sonnet/Opus, Codex/GPT-5, default
- [x] Keep under 150 lines (140 lines)

## Task 3: Create `app/api/admin/audit-logs/route.ts` [DONE]
- [x] GET with pagination via query params
- [x] Support `Accept: text/csv` for CSV export
- [x] Admin auth check using `verifyAdminRequest` from `lib/admin-auth.ts`

## Task 4: Create `app/api/admin/token-usage/route.ts` [DONE]
- [x] GET with aggregation by user
- [x] Admin auth check using `verifyAdminRequest` from `lib/admin-auth.ts`

## Task 5: TypeScript Verification [DONE]
- [x] `npx tsc --noEmit 2>&1 | grep "audit\|token-attribution"` — zero errors (17 pre-existing errors, none from new files)

## Enterprise Data Collection — Review

### Files Created
| File | Lines | Purpose |
|------|-------|---------|
| `lib/audit-service.ts` | 126 | Enhanced audit log with user_id, pagination, CSV export |
| `lib/token-attribution-service.ts` | 140 | Token cost tracking per user/provider with cost estimation |
| `app/api/admin/audit-logs/route.ts` | 52 | Admin API: paginated audit logs + CSV download |
| `app/api/admin/token-usage/route.ts` | 36 | Admin API: aggregated token usage per user or team |

### Design Decisions
1. Used `ALTER TABLE ... ADD COLUMN` in try/catch for safe idempotent migration (no schema versioning overhead).
2. Both services use lazy initialization flags (`migrated`, `initialized`) — table setup runs once per process.
3. Pricing is hardcoded as a lookup map with substring matching (e.g. "claude-4-sonnet" matches "claude-sonnet"). Easy to make configurable later.
4. Admin auth uses existing `verifyAdminRequest` from `lib/admin-auth.ts` — same pattern as all other `/api/admin/*` routes.
5. CSV export caps at 10,000 rows to prevent memory issues on large datasets.
6. All functions are synchronous (better-sqlite3 is sync) — no unnecessary async wrappers.

---

---

# QA Bug Fixes (March 2026)

## Bug 7 (Critical): Concurrent Access Crash
- [x] Reduce PTY grace period from 60min to 30s in server.js
- [x] Add Socket.IO connection limit middleware (max 100)
- [x] Add periodic map cleanup interval (every 5 min)
- [x] Enable SQLite WAL mode (database.ts — auth/db.ts and johnny5-db.ts already had it)
- [x] Adjust MEMORY_PANIC_THRESHOLD_MB in render.yaml (1800 → 1200)

## Bug 1 (Blocker): Team Invite — No Email + No Pending Display
- [x] Wire Resend email into invite route
- [x] Return pending invitations from members API + team detail API
- [x] Add pending invitations section to TeamTab UI
- [x] Add Copy Link button for pending invitations

## Bug 2 (Blocker): Join Link Blank Page
- [x] Investigate /alpha/ path prefix routing — no rewrite existed
- [x] Added rewrites in next.config.js: /alpha/api/* → /api/* and /alpha/* → /*

## Bug 3 (Major): Alpha Form White Screen Error
- [x] Replace alert() with inline styled error in alpha/page.tsx

## Bug 5 (Major): Dashboard "Back to IDE" → localhost
- [x] Fix href in vibe-dashboard.html to https://coder1.ai/ide

## Bug 6 (Minor): Summaries "Failed to load" Error
- [x] Update error messages in TeamPanel.tsx and SummariesTab.tsx

## QA Bug Fixes — Review

### Files Modified
| File | Bug | Change |
|------|-----|--------|
| `server.js` | #7 | PTY grace 60min→30s, Socket.IO max 100 connections, 5-min map cleanup |
| `lib/database.ts` | #7 | Enable SQLite WAL mode |
| `render.yaml` | #7 | Memory panic threshold 1800→1200 |
| `app/api/team/[teamId]/invite/route.ts` | #1 | Send Resend email on invite |
| `lib/auth/db.ts` | #1 | Add `getPendingInvitations()` |
| `lib/auth/supabase-db.ts` | #1 | Add `getPendingInvitations()` |
| `lib/auth/index.ts` | #1 | Export `getPendingInvitations` |
| `app/api/team/[teamId]/route.ts` | #1 | Return pendingInvitations in team detail |
| `app/api/team/[teamId]/members/route.ts` | #1 | Return pendingInvitations in members list |
| `components/team/TeamPanel.tsx` | #1,#6 | Add pending state, refresh on invite, friendlier error msgs |
| `components/team/tabs/TeamTab.tsx` | #1 | Pending invitations section with Copy Link |
| `components/team/tabs/SummariesTab.tsx` | #6 | Friendlier retry error message |
| `next.config.js` | #2 | Rewrite /alpha/api/* → /api/* and /alpha/* → /* |
| `app/alpha/page.tsx` | #3 | Replace alert() with inline styled error |
| `CANONICAL/vibe-dashboard.html` | #5 | Back to IDE → https://coder1.ai/ide |

### TypeScript Verification
- 0 new errors introduced (17 pre-existing errors remain unchanged)

---

## Review

### Files Modified (Phase 0)
| File | Change |
|------|--------|
| `lib/api-middleware.ts` | Rewrote validateAuth to use JWT |
| `app/api/auth/session/route.ts` | Issue real JWTs, proper cookies |
| `instrumentation.ts` | JWT secret validation at startup |
| `app/api/sessions/route.ts` | Auth + ownership on all handlers |
| `app/api/johnny5/chat/route.ts` | Rate limiting + XML prompt boundaries |
| `lib/auth/extract-user-id.ts` | Added premium gating helpers |
| `app/api/johnny5/supervision-facts/route.ts` | Server-side premium check |
| `services/johnny5/j5-bridge.ts` | Removed sensitive token logging |
| `app/api/claude-bridge/spawn/route.ts` | Removed partial token from error log |
| 31 files (hardcoded paths) | See Step 0.8 above |

### What Was NOT Changed
- `lib/auth/jwt.ts` — Already correct. `validateProductionSecrets()` remains as backup.
- `lib/hooks/useAuth.ts` — Already had proper token refresh.
- `middleware.ts` — Auth cookie check for protected routes already works.
- `lib/premium-client.ts` — Client-side UX gate; real enforcement is on Premium API server.
- CORS and CSRF — Already handled (`sameSite: 'strict'` cookies, CORS headers in claude route).

### Key Decisions
1. Used existing in-memory rate limiter (not @upstash/ratelimit which isn't installed). Sufficient for single-dyno.
2. Premium gating uses JWT `subscriptionTier` claim — no extra database call needed.
3. Session ownership backward-compatible: legacy sessions without userId still accessible.
4. Dev mode keeps `'default'` userId fallback for convenience.
