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

## Phase 2 — Lock the file routes (C2 + H2, the cross-tenant read)  ✅ done (commit 7f67ee8df)
- [x] `lib/api-middleware.ts` — `withFileMiddleware` flipped to `requireAuth: true`.
- [x] `files/read` + `files/tree` — userId derived ONLY from verified `user`; removed the `queryUserId || 'default-user'` fallback.
- [x] `files/write`, `files/create`, `save-temp-image` — added `requireUser()` (were previously **unauthenticated raw handlers** — worse than the audit's "flip a flag" framing); fixed the `startsWith` sibling-prefix bug (H4) on each; canonicalized the `/tmp` guard in save-temp-image.
- [x] `files/upload` — added `requireUser()`; uploads now scoped to the authenticated user's own workspace dir (basename-guarded), not shared `default`.
- [ ] **Bridge-side containment fix — NOT DONE** (`bridge-cli/src/file-handler.js:197-227`). Deferred: the web-side auth fix (C2) already blocks the cross-tenant exploit, but the bridge's own no-op absolute-path guard should still be hardened as defense-in-depth. Left for a bridge-focused follow-up.
- **Verify:** guard logic unit-verified via node; full route-level verify (`GET /api/files/read?path=/etc/passwd&userId=x` → 401) needs a running server + deps installed.

## Phase 3 — Lock the sandbox + checkpoint routes (C1 + H1)  ✅ done (commit 7f67ee8df)
- [x] `app/api/sandbox/[sandboxId]/route.ts` — `authorizeSandbox()` on GET/POST/DELETE: `requireUser()` + ownership check (`sandbox.userId === auth.userId`), 404 on mismatch to prevent enumeration.
- [x] `app/api/checkpoint/route.ts` — strict sessionId allowlist (`/^[A-Za-z0-9_-]+$/`, ≤128) validated in POST and GET before any `path.join`. (Full auth on checkpoint deferred — see note; the terminal/checkpoint flow may call it without a user session, so hard `requireUser` needs live-flow verification before enforcing.)
- **Verify:** sessionId guard unit-verified (`../../etc` → invalid); sandbox 401/404 paths need a running server to exercise end-to-end.

## Known verification gaps (be honest)
- **No `tsc` / jest run** — TypeScript and jest are not installed in this checkout, and installing them here risks the native-binding/build-safety rules. The pure guard logic was proven via node, but type-correctness of the route edits and the full test suite must be confirmed on your next `npm install && npm run build`.
- **Checkpoint auth + bridge containment** intentionally deferred (notes above).

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
