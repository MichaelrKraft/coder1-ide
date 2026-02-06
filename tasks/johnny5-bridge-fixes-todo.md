# Johnny5 Bridge & Limited Mode Fixes - Todo

## Root Cause Analysis

### Finding 1: Shell Escaping Bug in Bridge (CRITICAL)
The bridge log at `~/.coder1/logs/bridge.log` reveals the root cause of Johnny5 memory failures:

```
/bin/sh: line 57: - Name: Mike: command not found
/bin/sh: line 62: - Favorite color: Cyan blue: command not found
/bin/sh: -c: line 63: syntax error near unexpected token `17-hour" coding sessions "possible'
```

**What's happening:**
1. Server (`johnny5-bridge-service.ts:342`) builds: `claude '<escaped-prompt>'` with single-quote escaping
2. Sends to bridge via Socket.IO as a string
3. Bridge's `parseCommand()` in `claude-executor.js:739` tries to re-parse the string, stripping quotes incorrectly
4. Bridge's `quotedArgs` re-wraps in double quotes (but misses edge cases with embedded quotes and newlines)
5. `spawn(claudePath, quotedArgs, { shell: true })` passes to `/bin/sh` which interprets multi-line prompt content as separate shell commands

The personal facts in the system prompt (e.g., `- Favorite color: Cyan blue`, text with `"quotes"`) get interpreted as shell commands instead of being part of the prompt.

### Finding 2: Mode Only Fetched Once (MEDIUM)
`ChatTab.tsx:220` fetches mode with `useEffect(() => { fetchJohnny5Mode(); }, [])` — only on mount. If the user connects the bridge AFTER the page loads, the Limited Mode banner never clears.

### Finding 3: Bridge IS Connected to Production
The bridge log confirms production sessions work (interactive Claude sessions spawn successfully). The bridge at PID 14449 has an active session on `https://coder1.ai`. The issue is NOT the connection — it's that Johnny5 chat commands with personal data fail due to the shell escaping bug, and the mode banner doesn't auto-refresh.

## Plan

- [x] **Fix 1: Shell escaping in `executeNonInteractive`** — Critical — FIXED
  - In `bridge-cli/src/claude-executor.js`, replaced the `parseCommand` + `quotedArgs` + `shell: true` approach
  - Now uses `spawn('/bin/sh', ['-c', shellCommand])` to pass the server's already-escaped command directly to the shell
  - Handles claude path replacement and model injection via string operations on the pre-escaped command

- [x] **Fix 2: Mode polling in `ChatTab.tsx`** — Medium — FIXED
  - Added `setInterval(fetchJohnny5Mode, 30000)` with proper cleanup via `clearInterval`
  - When bridge connects after page load, the banner will clear within 30 seconds

- [ ] **Fix 3: Deploy to production** — Required
  - Bridge CLI fix needs to be published and user reinstalls
  - ChatTab fix needs to be pushed and deployed on Render

## Files to Modify

| File | Change |
|------|--------|
| `bridge-cli/src/claude-executor.js` | Fix `executeNonInteractive` shell execution |
| `components/johnny5/chat/ChatTab.tsx` | Add mode polling interval |

## Review

### Changes Made

**`bridge-cli/src/claude-executor.js` — `executeNonInteractive()` (lines 493-529)**

Before: The method parsed the command string with `parseCommand()`, extracted args, re-quoted them with `quotedArgs`, and spawned with `shell: true`. This double-parsing broke when the server's single-quote-escaped prompt contained multi-line personal data (names, descriptions with quotes/apostrophes). The shell interpreted each line of the prompt as a separate command.

After: The method passes the server's pre-escaped command string directly to `spawn('/bin/sh', ['-c', shellCommand])`. The only string manipulation is:
1. Replacing `claude` at the start with `this.claudePath` (the resolved absolute path)
2. Optionally injecting `--model <name>` if specified and not already present

This eliminates all double-parsing. The server's escaping (`'` → `'\''`) is preserved intact.

**`components/johnny5/chat/ChatTab.tsx` — mode polling (lines 222-224)**

Before: `fetchJohnny5Mode()` was called once on mount with `useEffect([], [])`. If the bridge connected after page load, the "Limited Mode Active" banner never cleared.

After: Added `setInterval(fetchJohnny5Mode, 30000)` with a cleanup return. The mode is re-fetched every 30 seconds, so the banner clears within 30s of the bridge connecting.

### Deployment Notes

- **ChatTab fix**: Will take effect after pushing to master and deploying on Render
- **Bridge CLI fix**: Requires publishing a new bridge-cli version and user running `coder1-bridge update` or reinstalling. The fix is in the installed bridge at `~/.coder1/lib/node_modules/coder1-bridge/`
