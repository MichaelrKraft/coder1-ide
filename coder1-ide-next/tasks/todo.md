# Per-User Living Files & Memory Scoping

## Safety Nets
- [x] Create feature branch `feature/per-user-scoping`
- [x] Backup DB: `~/.coder1/johnny5.db.backup-pre-multiuser`
- [x] Backup living files: `~/.coder1/living-files.backup-pre-multiuser/`

## Phase A — Database & Memory Layer
- [x] A1. `lib/johnny5-db.ts` — Schema migration + userId on all 14 functions
- [x] A2. `services/memory/fact-extraction-service.ts` — userId on 7 functions
- [x] A3. `services/memory/pattern-detection-service.ts` — userId on 7+ functions
- [x] A4. `services/memory/memory-context-builder.ts` — userId on ContextBuildOptions
- [x] A5. `services/memory/search/hybrid-search.ts` — userId on search functions
- [x] A-gate: `npx tsc --noEmit` passes (only pre-existing test-helpers.ts errors)

## Phase B — Bridge Protocol
- [x] B1. `bridge-cli/src/bridge-client.js` — Living files init, sync, write handler
  - [x] B1a. Create `bridge-cli/src/living-files-handler.js` (new module)
    - LivingFilesHandler class with ensureDirectory, initializeDefaults, readAll, readAllWithSizeGuard, writeFile, createSnapshot
    - 9 default templates (SOUL, USER, MEMORY, AGENTS, TOOLS, IDENTITY, HEARTBEAT, BOOT, BOOTSTRAP)
    - Snapshot/history system with MAX_SNAPSHOTS_PER_FILE=20
    - 900KB payload guard for Socket.IO
  - [x] B1b. Modify `bridge-client.js` — Add livingfiles:sync on connection:accepted
  - [x] B1c. Modify `bridge-client.js` — Add livingfiles:write handler
  - [x] B1d. Modify `bridge-client.js` — Add livingfiles:request handler
- [x] B2. `server.js` — Forward livingfiles events (logging handlers for sync + write-ack)
- [x] B3. `services/bridge-manager.ts` — Cache, write queue, pending writes, remove fallback
  - [x] Living files cache (Map<userId, {files, loadedAt}>)
  - [x] Per-user write queue serialization
  - [x] livingfiles:sync + write-ack socket handlers
  - [x] Removed file op fallback (P0 fix)
  - [x] Fixed hasBridgeForUser (no fallback)
  - [x] getLivingFilesContext(), writeLivingFile(), flushPendingWrites()
  - [x] Pending file request cleanup in unregisterBridge()

## Phase C — Wire It Together
- [x] C1. `lib/living-files.ts` — Bridge-aware async functions
- [x] C2. `app/api/johnny5/chat/route.ts` — Auth fix, async prompt, thread userId
- [x] C3. Other API routes (6 files) — Extract userId from JWT, pass to DB/memory calls
  - [x] C3a. `onboarding/profile/route.ts` — getProfile/saveProfile
  - [x] C3b. `preferences/route.ts` — getProfile/saveProfile
  - [x] C3c. `context/search/route.ts` — searchMemory (HybridSearchConfig.userId)
  - [x] C3d. `context/memory-stats/route.ts` — getMemoryStats
  - [x] C3e. `context-for-claude/route.ts` — getExistingFacts/getRelevantFacts
  - [x] C3f. `supervision-facts/route.ts` — saveFacts

## Verification
- [x] TypeScript compile: `npx tsc --noEmit`
- [x] Dev mode regression check (manual — run `npm run dev` and test chat)
- [x] Review section

## Review

### Phase B1 — Living Files Bridge Handler (Feb 11, 2026)

**New file created:**
- `bridge-cli/src/living-files-handler.js` — Self-contained module with `LivingFilesHandler` class

**Existing file modified:**
- `bridge-cli/src/bridge-client.js` — 3 additions (require, sync-on-connect, two socket handlers)

**What changed in bridge-client.js:**
1. Added `require('./living-files-handler')` at top with other imports
2. Added `this.livingFilesHandler = null` in constructor for lazy init
3. Inside `connection:accepted` handler: initializes defaults, reads all files, emits `livingfiles:sync` with size guard
4. New `livingfiles:write` handler: validates filename, creates snapshot, writes content (append or overwrite), emits `livingfiles:write-ack`
5. New `livingfiles:request` handler: re-reads all files and emits `livingfiles:sync`

**Living files handler features:**
- 9 files with exact default templates as specified
- `.history/` directory with timestamped `.bak` snapshots (max 20 per file)
- Append mode uses read-concat-write (not fs.appendFile)
- 900KB payload guard truncates MEMORY.md from the beginning if over limit
- All methods have try/catch — errors never crash the bridge
- Handler is lazy-initialized on first use

**No existing functionality was modified.** All changes are purely additive.

### Phase C1 — Living Files Bridge-Aware Function (Feb 11, 2026)

**File modified:** `lib/living-files.ts`

**What changed:**
- Added `formatLivingFilesFromCache(files: Record<string, string>): string` — formats Bridge-cached living files into the same prompt format as the existing `loadLivingFilesContext()` function
- Iterates LIVING_FILES array, applies MEMORY_TRUNCATION_LIMIT to MEMORY.md, formats as `## FILENAME\n{content}` sections
- Exported for use by the chat route when reading from Bridge cache

**No existing functionality modified.** Pure addition.

### Phase C2 — Chat Route Auth Fix + userId Threading (Feb 11, 2026)

**File modified:** `app/api/johnny5/chat/route.ts`

**13 edits total:**

1. **Auth enforcement (P0 fix):** When auth header is present but token is invalid/expired, returns 401 instead of silently falling back to `userId = 'default'`. Changed from `let userId: string | null = null` to `let userId = 'default'`.

2. **Made `generateJohnny5SystemPrompt` async:** Now `async function generateJohnny5SystemPrompt(mode, userId): Promise<string>`. Required for Bridge cache reads.

3. **Living files via Bridge:** System prompt generation now tries Bridge cache first (`bridgeManager.getLivingFilesContext(userId)` + `formatLivingFilesFromCache()`), falls back to local disk `loadLivingFilesContext()`.

4. **MEMORY.md writes via Bridge:** After-response MEMORY.md append uses `bridgeManager.writeLivingFile()` for authenticated users, falls back to `appendToLivingFile()` for dev mode.

5. **userId threaded to all downstream calls:**
   - `searchMemory()` — Moltbot path, Gemini path
   - `buildMemoryContext()` — added to options
   - `getExistingFacts()`, `saveFacts()` — in setImmediate callback
   - `runPatternDetectionCycle()` — in setImmediate callback

6. **Fixed all `if (userId)` null-checks:** Changed 4 occurrences to `if (userId !== 'default')` since userId changed from nullable to always-string. Guards: Bridge service init, Bridge chat send, message counter increment, quota lookup.

7. **setImmediate fact extraction fix (P0):** Captured `userId` in `capturedUserId` const before async closure to prevent stale/missing userId in background extraction.

### Phase C3 -- API Route userId Extraction (Feb 11, 2026)

**6 files modified** (1 skipped: `setup/route.ts` has no user-scoped calls):

1. **`app/api/johnny5/onboarding/profile/route.ts`**
   - Added auth import + userId extraction to GET (added `request: NextRequest` param), POST, PATCH
   - `getProfile()` -> `getProfile(userId)` (3 call sites)
   - `saveProfile(data)` -> `saveProfile(data, userId)` (3 call sites)

2. **`app/api/johnny5/preferences/route.ts`**
   - Added auth import + userId extraction to GET (added `request: NextRequest` param), POST, DELETE
   - `getProfile()` -> `getProfile(userId)` (4 call sites)
   - `saveProfile(data)` -> `saveProfile(data, userId)` (4 call sites)

3. **`app/api/johnny5/context/search/route.ts`**
   - Added auth import + userId extraction to POST
   - Added `userId` to `HybridSearchConfig` object passed to `searchMemory()`

4. **`app/api/johnny5/context/memory-stats/route.ts`**
   - Added `NextRequest` import + auth import + userId extraction to GET (added `request: NextRequest` param)
   - `getMemoryStats()` -> `getMemoryStats(userId)`

5. **`app/api/johnny5/context-for-claude/route.ts`**
   - Added auth import + userId extraction to GET
   - `getExistingFacts(undefined, 30)` -> `getExistingFacts(undefined, 30, userId)`
   - `getRelevantFacts(task, 10)` -> `getRelevantFacts(task, 10, userId)`

6. **`app/api/johnny5/supervision-facts/route.ts`**
   - Added auth import + userId extraction to POST
   - `saveFacts('supervision', [fact])` -> `saveFacts('supervision', [fact], undefined, userId)`

**Pattern used in all files:**
```typescript
let userId = 'default';
const authHeader = request.headers.get('Authorization');
if (authHeader) {
  const token = extractTokenFromHeader(authHeader);
  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) { userId = decoded.userId; }
  }
}
```

**TypeScript check:** `npx tsc --noEmit` passes (only pre-existing test-helpers.ts errors).
