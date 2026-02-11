# Team Knowledge Sync - Phases 1, 2, 3 Implementation

## Status: COMPLETE

## Plan

### Phase 1: Local Database Schema
- [x] 1.1: Create `db/team-schema.sql` with 4 tables + indexes
- [x] 1.2: Register migration in `lib/auth/db.ts` initializeSchema()
- [x] 1.3: Add Team interfaces + 10 CRUD functions to `lib/auth/db.ts`

### Phase 2: GitHub OAuth
- [x] 2.1: Create `lib/auth/github-oauth.ts` (mirror google-oauth.ts)
- [x] 2.2a: Create `app/api/v2/auth/github/route.ts`
- [x] 2.2b: Create `app/api/v2/auth/github/callback/route.ts`
- [x] 2.3: Update `.env.local.example` with GitHub OAuth + Supabase vars

### Phase 3: Team Management API Routes
- [x] 3.1: Create `lib/auth/team-middleware.ts`
- [x] 3.2a: Create `app/api/team/create/route.ts`
- [x] 3.2b: Create `app/api/team/mine/route.ts`
- [x] 3.2c: Create `app/api/team/[teamId]/route.ts`
- [x] 3.2d: Create `app/api/team/[teamId]/invite/route.ts`
- [x] 3.2e: Create `app/api/team/join/route.ts`
- [x] 3.2f: Create `app/api/team/[teamId]/members/route.ts`
- [x] 3.2g: Create `app/api/team/[teamId]/knowledge/route.ts`
- [x] 3.3: Add `detectGitRemoteContext()` to existing `lib/git-context.ts`

### Verification
- [x] TypeScript compile check -- zero new errors (only pre-existing test-helpers.ts issues)

---

## Review

### Files Created (12 new)

| File | Purpose |
|------|---------|
| `db/team-schema.sql` | 4 tables (teams, team_members, team_invitations, team_sync_log) + 8 indexes |
| `lib/auth/github-oauth.ts` | GitHub OAuth flow: getGitHubOAuthURL, getGitHubTokens, getGitHubUser (with email fallback) |
| `lib/auth/team-middleware.ts` | Auth helpers: getAuthUser, requireTeamMember, requireTeamAdmin |
| `app/api/v2/auth/github/route.ts` | GET: Redirect to GitHub OAuth with CSRF state cookie |
| `app/api/v2/auth/github/callback/route.ts` | GET: Handle GitHub callback, validate state, create user, set JWT cookies, redirect to /ide |
| `app/api/team/create/route.ts` | POST: Create team (pro/team tier gate, auto-slug) |
| `app/api/team/mine/route.ts` | GET: List user's teams |
| `app/api/team/[teamId]/route.ts` | GET: Team details + members (requires membership) |
| `app/api/team/[teamId]/invite/route.ts` | POST: Invite by email (requires admin) |
| `app/api/team/join/route.ts` | POST: Accept invitation token |
| `app/api/team/[teamId]/members/route.ts` | GET: List members. DELETE: Remove member (admin, can't remove owner) |
| `app/api/team/[teamId]/knowledge/route.ts` | GET/DELETE: Team knowledge facts (Supabase TODO stubs) |

### Files Modified (3)

| File | Change |
|------|--------|
| `lib/auth/db.ts` | Added `randomBytes` import, team schema migration in initializeSchema(), 3 interfaces (Team, TeamMember, TeamInvitation), 10 CRUD functions |
| `lib/git-context.ts` | Added `detectGitRemoteContext()` -- synchronous function to detect GitHub org/repo from git remotes |
| `.env.local.example` | Added GitHub OAuth vars (NEXT_PUBLIC_GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) + Supabase vars (SUPABASE_URL, SUPABASE_SERVICE_KEY, TEAM_SYNC_INTERVAL_MS) |

### Key Design Decisions

1. **Team schema uses `db.exec(teamSchema)` as single call** (not split by semicolons) -- avoids edge case with SQLite handling of multi-statement scripts
2. **GitHub OAuth adds CSRF state parameter** via cookie (Google OAuth route didn't have this -- we're adding it for security)
3. **GitHub email fallback** -- if `user.email` is null, fetches from `/user/emails` endpoint (GitHub privacy setting edge case)
4. **Team middleware checks DB membership** (not JWT claims) -- ensures real-time access control
5. **verifyAccessToken returns null on failure** (not throws) -- team-middleware checks for null before proceeding
6. **Knowledge route has Supabase TODO stubs** -- returns empty array for GET, success for DELETE, ready for Supabase wiring in Phase 4-5
7. **detectGitRemoteContext is synchronous** (uses execSync) -- appropriate for server-side git detection, separate from the existing async utilities

### TypeScript Verification
- `npx tsc --noEmit --skipLibCheck` reports zero new errors
- All 17 pre-existing errors are in `__tests__/test-utils/test-helpers.ts` (JSX in .ts file)
