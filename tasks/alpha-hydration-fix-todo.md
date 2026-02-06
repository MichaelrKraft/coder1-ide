# Alpha Landing Page Hydration Error Fix

## Problem
React hydration error: "Hydration failed because the initial UI does not match what was rendered on the server. Did not expect server HTML to contain a <div> in <div>."

## Root Cause
Stale `.next` build cache. Running `npx next build` (production build) as a verification step left production build artifacts in `.next/` that conflicted with the dev server. The server rendered HTML from one compilation while the client hydrated with another, causing the DOM tree mismatch.

## Fix

- [x] **1. Kill server, delete `.next` cache**
  - `rm -rf .next` to remove stale production build artifacts.

- [x] **2. Restart dev server clean**
  - `npm run dev` starts fresh with no cached build.
  - Verified: `/alpha` compiles and loads with no errors.

## Review

Root cause was NOT a code error — the page edits (from alpha-landing-fixes-todo.md) are all correct. The issue was running `npx next build` for verification and then restarting the dev server without clearing the `.next` cache first. The production build artifacts caused a server/client mismatch during hydration. Fix: delete `.next` and restart clean.
