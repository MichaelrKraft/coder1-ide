# Coder1 Security Fix Plan — top criticals

Scoped from the 2026-07-10 audit. Ordered by urgency and dependency. Each phase is independently shippable. Paths relative to `coder1-ide-next/`.

Guiding decision: **the reusable auth helper already exists** — `getAuthenticatedUserId(request)` in `app/api/sessions/route.ts:13-38` (checks Authorization header → `auth-token` cookie → dev fallback → null). Extract it to `lib/auth/request-auth.ts` and reuse it everywhere below, rather than inventing a new auth scheme.

---

## Phase 0 — Contain the leaked token (do first, ~15 min, no code)
- [ ] Revoke `sk-ant-oat01-…` in the Anthropic console (`docs/AI_TEAM_FIX_COMPLETE.md:134`, also :204).
- [ ] Issue a replacement token; update it wherever it's actually consumed (env/secret store, **not** a committed file).
- [ ] Remove the value from the doc (replace with `sk-ant-oat01-…REDACTED`).
- [ ] Scrub git history: `bfg --replace-text` or `git filter-repo`, then force-push. Coordinate — this rewrites history for anyone with a clone.
- [ ] Same pass: delete `render-deploy.yaml` (commits `JWT_SECRET: coder1-bridge-secret-2025-…` at :39-40) and `vercel.json` (project deploys to Render only). Rotate that JWT secret too if it was ever used in prod.
- **Verify:** `git log -p -S 'sk-ant-oat01' -- docs/` returns nothing; old token 401s against the API.

## Phase 1 — Extract the auth helper (~30 min, enables everything after)
- [ ] Create `lib/auth/request-auth.ts` exporting `getAuthenticatedUserId(request): string | null` (moved verbatim from `sessions/route.ts`) plus a `requireUser(request)` variant that throws/returns a 401 `NextResponse`.
- [ ] Repoint `app/api/sessions/route.ts` to import it (no behavior change — proves the extraction is sound).
- **Verify:** sessions endpoints behave identically before/after; a request with no token still 401s in prod, still works in dev.

## Phase 2 — Lock the file routes (C2 + H2, the cross-tenant read) (~1–2 hr)
- [ ] `lib/api-middleware.ts:243` — flip `withFileMiddleware` to `requireAuth: true`.
- [ ] In every file route, derive `userId` **only** from `getAuthenticatedUserId()`. Delete the `queryUserId`/`'default-user'` fallback at `app/api/files/read/route.ts:83` and the equivalents in `files/write`, `files/create`, `files/upload`, `files/tree`, `save-temp-image`, `export`.
- [ ] `files/upload/route.ts:9-11` — replace the hardcoded `user-workspaces/default` with the authenticated user's own workspace dir.
- [ ] Bridge-side containment fix — `bridge-cli/src/file-handler.js:197-227`: compute the real project root, `path.resolve` the requested path, and **reject unless `resolved === root || resolved.startsWith(root + path.sep)`**. Make `.ssh`/`.env`/sensitive paths a hard block (return error), not a warning. This closes the "traversal guard is a no-op on absolute paths" bug independently of the web-side auth fix (defense in depth).
- **Verify:** `GET /api/files/read?path=/etc/passwd&userId=someoneelse` → 401 (no token) and, even with a valid token, the bridge rejects any path outside the user's project root.

## Phase 3 — Lock the sandbox + checkpoint routes (C1 + H1) (~1 hr)
- [ ] `app/api/sandbox/[sandboxId]/route.ts` — add `requireUser()` at the top of `GET`/`POST`/etc.; verify the caller **owns** `params.sandboxId` (look up the sandbox's owner via `tmuxServer.getSandbox`, compare to authenticated userId) before any `action`.
- [ ] `app/api/checkpoint/route.ts:159,446` — add auth; validate `sessionId` against traversal (`path.basename(sessionId) === sessionId` or a strict `/^[\w-]+$/` allowlist) before it reaches `path.join` at :172/:511; confirm ownership.
- **Verify:** unauthenticated `POST /api/sandbox/<id>` with `{action:'run',command:'id'}` → 401; a `sessionId` of `../../etc` → 400.

## Phase 4 — Harden the bridge command channel (C3) (~half day, most design work)
- [ ] `bridge-cli/src/claude-executor.js:557-610` — stop passing a free-form string to `spawn('/bin/sh',['-c',…])`. Define a structured command spec (executable + validated argv array) and spawn without a shell (`spawn(exe, argv, {shell:false})`).
- [ ] Bridge-side allowlist: only permit the known Claude/CLI invocation shape; reject anything else. Validate every arg, not just `--model`/`--add-dir`.
- [ ] `bridge-client.js:523-524` — treat `claude:execute` payloads as untrusted: schema-validate before dispatch.
- **Verify:** a crafted `claude:execute` payload with shell metacharacters (`; rm -rf`, `$(…)`, backticks) is rejected, not executed.

## Phase 5 — Cheap hardening (independent, ~1 hr total)
- [ ] Central `/api/**` gate: extend `middleware.ts` matcher to run a lightweight auth/deny default on API routes (allowlist the genuinely public ones like `/api/health`, `/api/component-capture`). This is the belt to Phase 2–3's suspenders and closes the *root cause*.
- [ ] SSRF (H3): in `screenshot-to-code/extract-brand` + `capture-url`, block `169.254.169.254`, all RFC-1918/loopback ranges, and re-validate the host on every redirect hop.
- [ ] Path checks (H4): replace bare `startsWith(root)` with `startsWith(root + path.sep)` in the files/tree/write/create routes.
- [ ] Security headers + `/api/health` trim in `next.config.js`: add CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy; drop `x-powered-by`; strip commit hash / memory / PTY internals from the health payload (keep `status` only, or gate the detail behind admin auth).
- [ ] `lib/rate-limiter.ts:46-55`: on Render, trust only the leftmost `x-forwarded-for` from the known proxy, not a client-supplied chain.

---

## Sequencing notes
- Phase 0 is standalone and urgent — do it now.
- Phase 1 unblocks 2 and 3; do it before them.
- Phases 2, 3, 5 are independent of each other once Phase 1 lands — parallelizable.
- Phase 4 is the largest and can trail the rest; C3 requires a stolen token or server compromise to exploit, so it's critical-but-not-first.

## Testing gate before shipping any phase
Per project rules: write a regression test that reproduces the hole first (prove it fails), then fix. Minimum coverage — one test per fixed route asserting 401 on no-auth and rejection on traversal/ownership mismatch. There is currently **no real `test` script** (only `test:memory`), so Phase 1 should also add a runnable `test` script wiring up the existing `jest.config.js` / `e2e/` so these regressions actually run.
```
```
