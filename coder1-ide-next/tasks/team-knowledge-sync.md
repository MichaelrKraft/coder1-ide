# Team Knowledge Sync — Implementation Tracker

## Status: COMPLETE

## Plan Reference
Full plan: `~/.claude/plans/noble-giggling-quiche.md`

---

## Phase 0: Pre-Implementation Fixes (MUST DO FIRST)

- [x] P0-1: Add UNIQUE index on `extracted_facts(fact_key)` in johnny5-db.ts
- [x] P0-2: Add UNIQUE index on `learned_patterns(pattern_type, pattern_description)` in johnny5-db.ts
- [x] P0-3: Add WAL mode pragma to `getAuthDatabase()` in auth/db.ts
- [x] P0-4: Add `busy_timeout = 5000` pragma to johnny5-db.ts

## Phase 1: Local Database Schema

- [x] 1.1: Create `db/team-schema.sql` (teams, team_members, team_invitations, team_sync_log)
- [x] 1.2: Register migration in `lib/auth/db.ts` — load team-schema.sql in initializeSchema()
- [x] 1.3: Add Team types and CRUD functions to `lib/auth/db.ts`

## Phase 2: GitHub OAuth

- [x] 2.1: Create `lib/auth/github-oauth.ts` (getGitHubOAuthURL, getGitHubTokens, getGitHubUser)
- [x] 2.2a: Create `app/api/v2/auth/github/route.ts` (redirect to GitHub)
- [x] 2.2b: Create `app/api/v2/auth/github/callback/route.ts` (handle callback)
- [x] 2.3: Update `.env.local.example` with GitHub OAuth + Supabase vars

## Phase 3: Team Management API Routes

- [x] 3.1: Create `lib/auth/team-middleware.ts` (getAuthUser, requireTeamMember, requireTeamAdmin)
- [x] 3.2a: Create `app/api/team/create/route.ts`
- [x] 3.2b: Create `app/api/team/mine/route.ts`
- [x] 3.2c: Create `app/api/team/[teamId]/route.ts`
- [x] 3.2d: Create `app/api/team/[teamId]/invite/route.ts`
- [x] 3.2e: Create `app/api/team/join/route.ts`
- [x] 3.2f: Create `app/api/team/[teamId]/members/route.ts`
- [x] 3.2g: Create `app/api/team/[teamId]/knowledge/route.ts`
- [x] 3.3: Add `detectGitRemoteContext()` to existing `lib/git-context.ts`

## Phase 4: Supabase Cloud Layer

- [x] 4.1: Create `db/supabase-team-knowledge.sql` (reference only)
- [x] 4.2: Install `@supabase/supabase-js` dependency (already installed)
- [x] 4.3: Update `.env.local.example` with Supabase vars (done with 2.3)

## Phase 5: Sync Service (Core Feature)

- [x] 5.1: Create `services/team-sync-service.ts` (singleton, push/pull/Realtime/validation)
- [x] 5.2a: Create `app/api/team/sync/status/route.ts`
- [x] 5.2b: Create `app/api/team/sync/trigger/route.ts`
- [x] 5.3: Modify `lib/johnny5-db.ts` — add team knowledge to getUnifiedContext()

## Phase 6: Magic Moments (YC Demo)

- [x] 6.1: Create `services/team-welcome-briefing.ts` (welcome briefing generator)
- [x] 6.2: Create `components/team/TeamCitation.tsx`
- [x] 6.3: Create `lib/hooks/useTeamSyncToasts.ts` (sync toast notifications)

## Phase 7: UI Integration

- [x] 7.1: Create `stores/useTeamStore.ts`
- [x] 7.2: Modify `components/status-bar/StatusBarCore.tsx` — add sync indicator
- [x] 7.3: Create `components/team/TeamPanel.tsx`

## Build Verification

- [x] TypeScript compile check (`npx tsc --noEmit --skipLibCheck`) — zero new errors
- [x] `npx next build` — full production build succeeds

---

## Review: Phase 4 & 5 (Feb 8, 2026)

### Files Created (4)

| File | Lines | Purpose |
|------|-------|---------|
| `db/supabase-team-knowledge.sql` | 27 | Reference SQL for Supabase cloud schema (team_knowledge table, indexes, realtime) |
| `services/team-sync-service.ts` | 420 | Singleton sync service: push local knowledge to Supabase, pull team knowledge, Realtime subscription, validation, exponential backoff |
| `app/api/team/sync/status/route.ts` | 24 | GET endpoint returning sync status + recent knowledge summary |
| `app/api/team/sync/trigger/route.ts` | 23 | POST endpoint to manually trigger sync cycle |

### Files Modified (1)

| File | Change |
|------|--------|
| `lib/johnny5-db.ts` | Added ~25 lines in `getUnifiedContext()` after line 1454 — queries `team_sync_log` joined to `extracted_facts` for team-contributed knowledge with `[team:@contributor]` attribution. Graceful degradation if table doesn't exist. |

### Architecture Decisions

1. **Singleton on `globalThis`** — Service survives HMR via `(globalThis as any).__teamSyncService` pattern (E5-15)
2. **Dynamic `require('@/lib/johnny5-db')`** — Avoids circular import since `johnny5-db` is also modified to read sync data
3. **`team_sync_log` table auto-created** — Since Phase 1 schema hasn't been implemented yet, the sync service creates the `team_sync_log` table itself in `ensureSyncLogTable()` if it doesn't exist
4. **`import 'server-only'`** — Added at top per edge case E4-1 to prevent client-side Supabase client creation
5. **Content hash normalization** — NFC normalize, trim, collapse whitespace, lowercase before SHA-256 for cross-platform consistency
6. **Batch processing** — SQLite reads processed 50 rows at a time with `setImmediate()` between batches (E5-1)
7. **Pagination** — Supabase pulls use `.range(from, to)` pagination, looping until results < page size (E5-4)
8. **Transaction for inserts** — Pulled rows inserted in a single SQLite transaction (E5-9)
9. **Realtime debounce** — Multiple Supabase Realtime events collapsed into single pull via 3s debounce timer (E5-10)
10. **Exponential backoff** — On sync failure: 1s, 2s, 4s, 8s, max 60s. After 5 failures, polling paused (E5-11)

### TypeScript Verification

- `npx tsc --noEmit --skipLibCheck` reports zero errors from new/modified files
- Only pre-existing errors in `__tests__/test-utils/test-helpers.ts` (JSX in .ts file)

---

## Review: Phase 1, 2 & 3 (Feb 8, 2026)

### Files Created (12)

| File | Lines | Purpose |
|------|-------|---------|
| `db/team-schema.sql` | 62 | 4 tables (teams, team_members, team_invitations, team_sync_log) + 8 indexes |
| `lib/auth/github-oauth.ts` | 111 | GitHub OAuth: getGitHubOAuthURL, getGitHubTokens, getGitHubUser (with /user/emails fallback) |
| `lib/auth/team-middleware.ts` | 44 | getAuthUser, requireTeamMember, requireTeamAdmin helpers |
| `app/api/v2/auth/github/route.ts` | 34 | GitHub OAuth redirect with CSRF state cookie |
| `app/api/v2/auth/github/callback/route.ts` | 110 | GitHub OAuth callback, validates state, creates/links user, sets JWT |
| `app/api/team/create/route.ts` | 57 | POST create team (pro/team tier gate, auto-slug) |
| `app/api/team/mine/route.ts` | 20 | GET user's teams |
| `app/api/team/[teamId]/route.ts` | 48 | GET team details + members |
| `app/api/team/[teamId]/invite/route.ts` | 51 | POST invite by email (admin required) |
| `app/api/team/join/route.ts` | 60 | POST accept invitation token |
| `app/api/team/[teamId]/members/route.ts` | 82 | GET list / DELETE remove (admin, can't remove owner) |
| `app/api/team/[teamId]/knowledge/route.ts` | 79 | GET/DELETE team facts (Supabase stubs) |

### Files Modified (3)

| File | Change |
|------|--------|
| `lib/auth/db.ts` | Team schema migration + 3 interfaces (Team, TeamMember, TeamInvitation) + 10 CRUD functions |
| `lib/git-context.ts` | Added `detectGitRemoteContext()` — parses git remote for org/repo |
| `.env.local.example` | Added GitHub OAuth + Supabase vars |

---

## Review: Phase 6 & 7 (Feb 8, 2026)

### Files Created (6)

| File | Lines | Purpose |
|------|-------|---------|
| `services/team-welcome-briefing.ts` | 81 | Welcome briefing generator, gated by `hasReceivedBriefing-{teamId}` in localStorage, emits `johnny5:teamWelcome` CustomEvent |
| `components/team/TeamCitation.tsx` | 48 | Inline `[team:@username]` badge + `parseTeamCitations()` parser |
| `lib/hooks/useTeamSyncToasts.ts` | 53 | Debounced sync toast notifications (5s window) |
| `stores/useTeamStore.ts` | 130 | Zustand store with `syncTeam` property, persist middleware |
| `components/team/TeamPanel.tsx` | 250 | Team management: create, invite, members, knowledge feed, sync |
| `components/team/index.ts` | 2 | Barrel exports |

### Files Modified (1)

| File | Change |
|------|--------|
| `components/status-bar/StatusBarCore.tsx` | Added Cloud icon, useTeamStore, sync indicator with 3 visual states |

### Edge Cases Handled

- E6-1/E6-2: Welcome briefing gated per teamId, empty facts still mark as received
- E6-4/E6-5: Citation parser only on assistant messages, handles hyphens/dots
- E6-6: Toast debounce 5s window for initial sync batching
- E7-1: `syncTeam` naming avoids `activeTeam` collision
- E7-2: Cloud icon (not Users) avoids agent team indicator collision
- E7-3: Zustand persist with partialize prevents SSR hydration issues

---

## Final Summary (Feb 8, 2026)

**Total new files**: 22
**Total new lines**: ~2,121
**Modified files**: 5 (lib/auth/db.ts, lib/johnny5-db.ts, lib/git-context.ts, .env.local.example, components/status-bar/StatusBarCore.tsx)
**TypeScript errors**: 0 new (17 pre-existing in test-helpers.ts)
**All 7 phases**: COMPLETE
