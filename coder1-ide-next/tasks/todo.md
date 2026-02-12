# Fix ENOENT Errors from Auto-Open Feature

## Problem
The auto-open feature in `page.tsx` detects file paths in Claude CLI terminal output and auto-opens them in Monaco. However, Claude CLI's TUI uses ANSI cursor positioning, and when those codes are stripped, garbled text gets matched as file paths by the regex. Examples:
- `autonomou_vibe_interface` (missing 's' in autonomous)
- `Readautonomous_vibe_inteface` ("Read" concatenated, missing 'r' in interface)
- `tem-schema.sql` (truncated from `team-schema.sql`)

These garbled paths fail with ENOENT and the error gets pumped into the terminal, annoying the user.

## Root Cause
`detectClaudeFilePaths()` uses `relativePattern` which is too permissive — it matches any `word/word/file.ext` pattern, including garbled ANSI-stripped text.

## Tasks
- [x] 1. Add `silent` parameter to `handleOpenFileFromPath` to suppress terminal error output
- [x] 2. Pass `silent: true` when calling from auto-open (line 1131)
- [x] 3. Add basic path validation in `detectClaudeFilePaths` to reject obviously garbled paths
- [ ] 4. Review section

## Review

### What changed (Feb 12, 2026)

**File modified: `app/ide/page.tsx`** — 4 edits:

1. **`handleOpenFileFromPath` signature** (line ~1007) — Added `silent?: boolean` third parameter
2. **Catch block** (line ~1068-1094) — When `silent=true`: logs failure quietly, does NOT set `fileErrors` state, does NOT set `activeFile`, does NOT emit error to terminal
3. **Auto-open caller** (line ~1131) — Passes `silent: true` so garbled path failures are invisible to user
4. **`detectClaudeFilePaths` filter** (line ~135) — Added regex guard that rejects paths where the first segment starts with an action word concatenated with another word (e.g., `Readautonomous...`), catching the most common ANSI-stripping corruption pattern

**Net effect:**
- Garbled paths from Claude CLI TUI output no longer produce visible ENOENT errors in the terminal
- Auto-open still works for correctly detected paths
- User-initiated file opens (clicks, etc.) still show errors as before
- No changes to terminal, server, or bridge code
