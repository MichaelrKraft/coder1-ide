# Team Module + Collaborative File Sync Session (Feb 13-14, 2026)

## Summary

Two-session sprint implementing local file sync for collaborative editing via bridges, fixing team module bugs, and resolving server stability issues (heap OOM crashes).

---

## What Was Built

### Local File Sync for Collaborative Editing (MVP Complete)

Implemented the full pipeline for collaborative file writes through user bridges to local filesystems. When any team member saves in the IDE, the change syncs to ALL connected team members' local machines.

**Architecture:**
```
Monaco Editor -> Yjs Update -> useCollaborativeEditor.autoSave()
  -> Socket.IO emit('collab:file-write')
  -> server.js handler -> BridgeManager.writeFileToTeam()
  -> For each team member with bridge:
      -> Bridge Socket emit('file:write-collab')
      -> Bridge CLI FileHandler.write()
      -> LOCAL Filesystem (per user)
```

**Phases completed:**
- Phase 0: Fixed y-monaco module resolution (added `transpilePackages: ['y-monaco']` to next.config.js)
- Phase 1: Core bridge write integration (Socket.IO collab events, IndexedDB offline queue, sequence numbers, hash comparison)
- Phase 4: Cross-platform compatibility (line endings, path separators, case collision detection, UTF-8 normalization, backup before overwrite, bridge-side team validation)
- Phase 6: Security hardening (path validation with blocked patterns, per-user rate limiting 100/min, audit logging, content versioning)
- Testing: 22 unit tests covering all critical paths

**Full plan:** `/Users/michaelkraft/.claude/plans/wiggly-noodling-map.md`

---

## Bugs Fixed

### 1. Team Creation 409 Conflict (Silent Failure)

**Problem:** Creating a team when one already existed returned a 409 from the API, but the UI showed no error — screen just went dark.

**Root Cause:** `useTeamStore.createTeam()` returned `null` on API errors (line 112). `TeamPanel.handleCreateTeam()` never checked the return value.

**Fix:**
- `stores/useTeamStore.ts` — `createTeam()` now throws with the API error message
- `components/team/TeamPanel.tsx` — Added try/catch with red error banner display

### 2. Team Not Loading on Mount

**Problem:** User belonged to "Coder1 Team" but saw the Create Team form because `fetchTeams()` was never called on mount.

**Fix:** Added `useEffect` in TeamPanel that calls `fetchTeams()` when no `syncTeam` is set.

### 3. Knowledge Facts Showing Empty Content

**Problem:** Team Knowledge section showed `@support_vkiai :` with blank values for 47 out of 50 facts.

**Root Cause:** Supabase `team_knowledge` table has three source types with different data structures inside the `data` JSONB column:

| Source Table | Key Field | Value Field |
|---|---|---|
| `extracted_facts` | `data.fact_key` | `data.fact_value` |
| `learned_patterns` | `data.pattern_type` | `data.pattern_description` |
| `memory_chunks` | `data.heading` | `data.content` |

The original `mapKnowledgeRow()` only handled the first two types. 47/50 facts were `memory_chunks`.

**Fix:** Updated `mapKnowledgeRow()` to handle all three source types. Added `mapAndSortKnowledge()` to sort specific facts before generic session memory chunks. Long content truncated to 200 chars.

### 4. Server Heap OOM Crashes (Critical)

**Problem:** Server repeatedly crashed with "JavaScript heap out of memory" (exit code 134) after ~5 minutes of uptime, even with 4GB and 8GB heap limits.

**Root Cause:** The Memory Exporter module (`services/memory-exporter.ts`) — even just the `require()` call — eagerly loaded 4 heavy service modules (EternalMemorySearch, contextDatabase, embeddingService, vectorSearchService). Combined with Next.js dev mode holding ~10K compiled modules in memory, this exceeded available heap. The 30-second auto-export interval compounded the leak.

**Fix (Permanent):**
1. `server.js` — Completely disabled Memory Exporter module loading (not just the interval). The `require()` itself was the problem.
2. `package.json` — Changed dev script to `NODE_OPTIONS='--max-old-space-size=4096' node server.js` as a safety net.

**TODO:** Refactor memory-exporter.ts to use lazy loading or a separate worker process before re-enabling.

### 5. Team Auth Bypass in Bridge (Security)

**Problem:** Bridge-side team validation had a bypass: `_authorizedTeams.size > 0` check meant writes from unknown teams were allowed before any `team:authorized` event was received.

**Fix:** Removed the `size > 0` bypass. Writes from unknown teams are now rejected. Added `_teamAuthInitialized` flag for diagnostics.

---

## Files Modified

### Core Feature (Collab File Sync)
| File | Changes |
|---|---|
| `lib/hooks/useCollaborativeEditor.ts` | Replaced HTTP auto-save with Socket.IO, added write-ack listener, IndexedDB offline queue |
| `server.js` | Added `collab:file-write` handler, rate limiting, case collision detection, audit logging, memory exporter disabled |
| `services/bridge-manager.ts` | Added `getTeamBridges()`, `writeFileToTeam()`, line ending normalization, path normalization |
| `bridge-cli/src/bridge-client.js` | Added `file:write-collab` handler, platform detection, backup, team validation, security patterns |
| `lib/johnny5-db.ts` | Added `collab_audit_log` table and `logCollabAudit()` function |
| `next.config.js` | Added `transpilePackages: ['y-monaco']` |

### Bug Fixes
| File | Changes |
|---|---|
| `stores/useTeamStore.ts` | `createTeam` throws errors instead of returning null |
| `components/team/TeamPanel.tsx` | Error display, fetchTeams on mount, mapKnowledgeRow for all 3 source types, sort order |
| `server.js` | Disabled Memory Exporter completely (OOM fix) |
| `package.json` | Added `NODE_OPTIONS='--max-old-space-size=4096'` to dev script |

### Tests
| File | Description |
|---|---|
| `__tests__/collab-file-sync.test.ts` | 22 test cases covering writeFileToTeam, path validation, line endings, case collisions, stress, reconnect |

---

## What's Deferred (v1.1)

| Phase | Description | Status |
|---|---|---|
| Phase 2 | Offline queue persistence to database (currently in-memory only) | Not started |
| Phase 3 | Large file chunking (>256KB), write retry with exponential backoff | Not started |
| Phase 5 | SyncStatusIndicator component, per-user sync tracking, ConflictModal | Not started |
| Memory Exporter | Needs refactoring to lazy loading or separate worker process | TODO in server.js |

---

## How to Test

### Team Panel
1. Open http://localhost:3001/ide
2. Click Team tab in sidebar
3. Should auto-load "Coder1 Team" (mike is admin)
4. Knowledge facts should show real content (50 facts, sorted by specificity)

### Collaborative Editing
1. Start bridge: `coder1-bridge start`
2. Enter pairing code from IDE
3. Join a team
4. Open a file in Monaco editor
5. Make changes, wait 500ms
6. Check: file on local machine reflects changes via bridge

### Cross-Platform
- Windows users get CRLF line endings, Mac/Linux get LF
- Paths use `/` in protocol, native separator on bridge
- Case collisions detected and warned (e.g., `Button.tsx` vs `button.tsx`)

---

## Key Database State

```sql
-- Mike's account
SELECT * FROM users WHERE username = 'mike';
-- id: 1bb57b6fc9c133504a02674b3c7d43d6, email: mike@coder1.dev

-- Mike's team membership
SELECT t.name, tm.role FROM teams t JOIN team_members tm ON t.id = tm.team_id
WHERE tm.user_id = '1bb57b6fc9c133504a02674b3c7d43d6';
-- Coder1 Team | admin
```

---

## Session Timeline

- **Feb 13 afternoon**: Planned and implemented Phases 0, 1, 4, 6 + tests (collab file sync MVP)
- **Feb 13 evening**: Code review, security fix (team auth bypass), Johnny5 panel audit
- **Feb 13 late night**: Fixed team creation 409 error, knowledge facts display, server OOM crashes
- **Feb 14 12:30 AM**: Continued session — verified fixes, improved mapKnowledgeRow for all 3 source types, added sorting
