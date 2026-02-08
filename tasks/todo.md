# Task: Fix Bridge CLI Interactive Session Timeout

## Goal
The Claude CLI interactive session in the bridge times out after 60 minutes of inactivity because the timeout timer is a one-shot timer that never resets on user activity. Fix it so the timer resets whenever the user sends input.

## Root Cause
In `bridge-cli/src/claude-executor.js`:
- Line 379: `const interactiveTimeoutMs = this.maxTimeout * 5` → 720,000 × 5 = 3,600,000ms = 60 minutes
- Line 380: `setTimeout(...)` fires once and is never reset
- Line 442-448: `writeToSession()` writes input to PTY but doesn't reset the timer
- Result: Timer starts when session begins, fires 60 minutes later regardless of activity

## Plan

- [x] 1. Refactor the one-shot `setTimeout` into a resettable inactivity timer in `executeInteractive()`
- [x] 2. Reset the timer in `writeToSession()` whenever user sends input
- [x] 3. Verify no other code paths need updating (resizeSession, killSession also updated)

## Review

**Date**: 2026-02-07

**Files modified (1):**
- `bridge-cli/src/claude-executor.js` — Changed session storage from raw PTY process to `{ ptyProcess, resetInactivityTimer }` object. Timer now resets on both user input (`writeToSession`) and PTY output (`onData`). Updated `resizeSession` and `killSession` to use new structure.

**What changed:**
- `activeSessions` entries changed from `ptyProcess` → `{ ptyProcess, resetInactivityTimer }`
- One-shot `setTimeout` replaced with a `resetInactivityTimer()` function that clears and restarts the timer
- `writeToSession()` calls `resetInactivityTimer()` on every user input
- `ptyProcess.onData()` calls `resetInactivityTimer()` when Claude responds (output = active session)
- `resizeSession()` and `killSession()` updated to access `session.ptyProcess`
- Timer still cleaned up on exit via `clearTimeout(inactivityTimer)`

**Before**: Session starts → 60-minute timer starts → fires regardless of activity → session killed
**After**: Session starts → 60-minute timer starts → resets every time user types or Claude responds → only fires after 60 minutes of true inactivity
