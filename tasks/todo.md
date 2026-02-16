# Johnny5 BackgroundExecutor

## Context
Johnny5 can queue tasks but nothing processes them. The OpportunityEngine has research/build stubs that return "queued" but never execute. We need a BackgroundExecutor that polls TaskTracker, executes tasks via Gemini API, and delivers results.

**User Story**: "Johnny5, research competitor pricing overnight and report at 8am."

## Tasks

- [x] 1. Add DB columns (`scheduled_at`, `deliver_at`, `retry_count`, `last_error`) to tasks table
- [x] 2. Update TaskTracker to handle scheduling fields in create/query
- [x] 3. Create `services/johnny5/background-executor.ts` — Core polling + routing + execution (~200 lines)
- [x] 4. Wire BackgroundExecutor to server.js (after CronService init)
- [x] 5. Wire OpportunityEngine stubs to create real tasks via TaskTracker
- [x] 6. Add notifications table + API route for offline delivery
- [x] 7. Test end-to-end — Create task, verify execution, check delivery (needs server restart)

## Review

### Changes Made

**1. Modified: `lib/johnny5-db.ts`**
- Added 5 columns to tasks CREATE TABLE: `scheduled_at`, `deliver_at`, `retry_count`, `max_retries`, `last_error`
- Added migration Step 9: ALTERs for existing databases (same pattern as other migrations)
- Added migration Step 10: `notifications` table with `id`, `task_id`, `user_id`, `message`, `type`, `delivered`, `created_at`, `delivered_at`

**2. Modified: `types/johnny5.d.ts`**
- Added 5 optional fields to `Johnny5Task`: `scheduledAt`, `deliverAt`, `retryCount`, `maxRetries`, `lastError`

**3. Modified: `services/johnny5/task-tracker.ts`**
- Updated `mapDbTaskToJohnny5Task` to accept and return scheduling fields from DB rows
- Updated `createTask` to accept `scheduledAt` and `deliverAt` params, sets them via direct DB update after insert
- Re-fetches task after scheduling column updates

**4. New file: `services/johnny5/background-executor.ts`** (~250 lines)
- Polls TaskTracker every 30s for queued tasks
- Max 2 concurrent executions
- Routes research/monitor/trend → Gemini API (no Bridge needed)
- Routes build/fix → BridgeManager (requires connected Bridge)
- Respects `scheduledAt` (skips future-scheduled tasks)
- Respects `deliverAt` (stores result, delivers when time arrives)
- Retry logic: exponential backoff, max 2 retries, stores `last_error`
- Crash recovery: re-queues `in_progress` tasks on startup
- Delivery: Socket.IO (instant) + Telegram (offline) + notifications table (catch-up)

**5. Modified: `server.js`** (~8 lines)
- Added BackgroundExecutor initialization after Claude session indexing, before Proactive Services
- Passes `io` and `bridgeManager` references

**6. Modified: `services/johnny5/opportunity-engine.ts`**
- Replaced `research` stub → `TaskTracker.createTask()` with type 'research'
- Replaced `build` stub → `TaskTracker.createTask()` with type 'build'
- Both now create real tasks that BackgroundExecutor will process

**7. New file: `app/api/johnny5/notifications/route.ts`** (~55 lines)
- GET: Fetch undelivered notifications (up to 50)
- PATCH: Mark notifications as delivered by passing `{ ids: [...] }`

### Verification (pre-restart)
- Tasks API returns new fields (`retryCount`, `maxRetries`) correctly
- Notifications API returns empty array (no notifications yet)
- Test research task created and queued successfully

### Verification (post-restart)
- Server restarted, BackgroundExecutor initialized: `[BackgroundExecutor] Started (poll: 30s, max: 2 concurrent)`
- 3 queued tasks picked up and all completed via Gemini API
- Created fresh e2e test task → queued → in_progress → completed with Gemini result
- Notification stored in SQLite `notifications` table (verified via GET /api/johnny5/notifications)
- PATCH /api/johnny5/notifications marks notifications as delivered correctly
- Socket.IO `johnny5:task-completed` events emitted for real-time delivery

### Bugs Fixed During Testing
- **server.js `await` outside async**: Claude session indexing used `await` in synchronous context → changed to `.then()/.catch()`
- **Dynamic imports failing silently**: `storeNotification` used `await import('@/lib/johnny5-db')` which failed silently in server.js context → moved to top-level imports

### Files Modified
1. `lib/johnny5-db.ts` — DB schema + migrations (tasks columns + notifications table)
2. `types/johnny5.d.ts` — 5 new fields on Johnny5Task
3. `services/johnny5/task-tracker.ts` — Scheduling field handling
4. `services/johnny5/background-executor.ts` — **NEW** (core executor, ~250 lines)
5. `server.js` — BackgroundExecutor initialization (~8 lines)
6. `services/johnny5/opportunity-engine.ts` — Research/build stubs replaced
7. `app/api/johnny5/notifications/route.ts` — **NEW** (notification API, ~55 lines)
