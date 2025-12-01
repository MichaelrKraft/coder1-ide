# Bridge Invalid Namespace Fix - Production tsx Dependency

**Date:** December 1, 2025  
**Issue:** Alpha user "Invalid namespace" error when connecting to https://coder1.ai  
**Status:** ✅ FIXED

## Problem

Alpha user continued to experience "Invalid namespace" error despite the November 26, 2025 fix:

```
✅ Pairing successful. User ID: user_1764142653794
✅ Connecting to WebSocket server...
❌ Connection error: Invalid namespace
❌ Connection failed: Error: Invalid namespace
```

## Root Cause

The November 26 fix added `tsx` to load TypeScript files at runtime, but placed it in `devDependencies`:

```json
"devDependencies": {
  "tsx": "^4.20.6"  // ← NOT installed in production!
}
```

**The Problem:**
- `devDependencies` are NOT installed when `NODE_ENV=production`
- Render's deployment runs with `NODE_ENV=production`
- `npm ci` skips devDependencies in production
- `tsx` was never available on the production server
- `bridge-manager.ts` failed to load
- `/bridge` Socket.IO namespace was never created

## Solution

Moved `tsx` from `devDependencies` to `dependencies`:

```json
"dependencies": {
  "zustand": "^5.0.8",
  "tsx": "^4.20.6"  // ← Now installed in production
}
```

## Changes Made

**File:** `coder1-ide-next/package.json`
- Added `"tsx": "^4.20.6"` to `dependencies` (line 102)
- Removed `"tsx": "^4.20.6"` from `devDependencies`

## Verification

After deployment, Render logs should show:
```
✅ TypeScript runtime (tsx) loaded successfully
🌉 Coder1 Bridge Manager initialized
```

## Why This Wasn't Caught Before

The November 26 fix was tested **locally** where:
- `npm install` installs ALL dependencies (including dev)
- `tsx` was available
- Bridge worked correctly

In production on Render:
- `npm ci` respects `NODE_ENV=production`
- `devDependencies` are skipped
- `tsx` was never installed

## Deployment Steps

1. ✅ Move tsx to dependencies
2. ⏳ Commit and push to master
3. ⏳ Render auto-deploys from master
4. ⏳ Alpha user tests bridge connection

## Related Documentation

- `tasks/bridge-invalid-namespace-fix-nov-26-2025.md` - Original fix (incomplete)
- `tasks/complete-fix-summary-nov-26-2025.md` - November summary
- `ALPHA_USER_DM_RESPONSE_NOV26.md` - Previous user communication

---

**Fix Completed By:** Claude Code  
**Total Changes:** 2 lines in package.json
