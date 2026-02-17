# Fix Render Build Failure — JWT Secret Check Crashes `next build`

## Problem

Render build failed with:
```
Error: FATAL: JWT_REFRESH_SECRET environment variable is required in production.
```

## Root Cause

`lib/auth/jwt.ts` lines 17-24 throw at **module-level** when `NODE_ENV=production` and `JWT_SECRET` / `JWT_REFRESH_SECRET` are missing. During `next build`, Next.js sets `NODE_ENV=production` and imports all route modules to collect page data. Any route importing `jwt.ts` (directly or via `extract-user-id.ts`) triggers the fatal throw.

Import chain: `app/api/checkpoint/route.ts` → `lib/auth/extract-user-id.ts` → `lib/auth/jwt.ts`

## Todo

- [x] 1. **Replace module-level throw with runtime validation** — Moved the production env var checks into a `validateProductionSecrets()` function. Called from `generateTokens()` (the only security-critical path that signs new tokens). Verify/decode functions use module-level constants that fall back to random bytes — safe at import time.
- [ ] 2. **Test** — Local build OOM'd (memory constraints). Relying on Render build.
- [ ] 3. **Push and verify Render build** — Commit, push, confirm Render build succeeds.
- [ ] 4. **Add review section** — Below.

## Review

### Changes Made (single file: `lib/auth/jwt.ts`)

**Before (lines 17-24):**
```typescript
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) { throw new Error('FATAL: JWT_SECRET...'); }
  if (!process.env.JWT_REFRESH_SECRET) { throw new Error('FATAL: JWT_REFRESH_SECRET...'); }
}
```

**After:**
```typescript
function validateProductionSecrets(): void {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) { throw new Error('FATAL: JWT_SECRET...'); }
    if (!process.env.JWT_REFRESH_SECRET) { throw new Error('FATAL: JWT_REFRESH_SECRET...'); }
  }
}
// Called in generateTokens() — the only function that creates tokens
```

**Why this is safe:**
- `generateTokens()` is the only place that signs new tokens (security-critical)
- `verifyAccessToken`/`verifyRefreshToken` use module-level constants with random byte fallbacks — verification simply fails if env vars aren't set
- Development warning (`console.warn`) on line 13-15 is unaffected
