# Terminal Session Persistence Logic Flow Test

## Current Implementation Flow

### On First Page Load (No existing session):
1. IDE page: `terminalSessionId` initialized from localStorage → `null` (nothing stored)
2. IDE page: Passes `restoredSessionId={null}` to TerminalContainer
3. TerminalContainer: Passes `restoredSessionId={null}` to Terminal
4. Terminal: `sessionId` state starts as `null`
5. Terminal restoration effect (line 271): Condition `restoredSessionId && !sessionId` → `false && true` → **SKIP**
6. Terminal session creation effect (line 755): 
   - Check: `restoredSessionId && !sessionId` → `false && true` → **SKIP WAIT**
   - Creates new session via REST API
   - Sets `sessionId` to new value
   - Saves to localStorage

### On Navigation Back (Existing session in localStorage):
1. IDE page: `terminalSessionId` initialized from localStorage → `"session_123..."` ✅
2. IDE page: Passes `restoredSessionId={"session_123..."}` to TerminalContainer
3. TerminalContainer: Passes `restoredSessionId={"session_123..."}` to Terminal
4. Terminal: `sessionId` state starts as `null`
5. Terminal restoration effect (line 271): Condition `restoredSessionId && !sessionId` → `true && true` → **RUNS**
   - Sets `sessionId` to `"session_123..."`
6. Terminal session creation effect (line 755):
   - Check: `restoredSessionId && !sessionId` → `true && false` → **SKIP WAIT**
   - Check: `sessionId && !sandboxMode && !agentMode` → `true && true && true` → **RUNS RECONNECTION LOGIC**
   - Sets terminalReady → triggers connection to backend

## Potential Issues

### Issue 1: Effect Execution Order
The restoration effect (line 271) and session creation effect (line 755) have different dependencies:
- Restoration: `[restoredSessionId]`
- Session creation: `[restoredSessionId, sessionId]`

On first render when `restoredSessionId` has a value:
1. Restoration effect runs FIRST (only depends on `restoredSessionId`)
2. Sets `sessionId` state
3. This triggers re-render
4. Session creation effect runs (now `sessionId` is set)

✅ **This should work correctly**

### Issue 2: Session Creation Effect Running Multiple Times
The session creation effect has a guard: `if (sessionCreatedRef.current) return;`
But it sets `sessionCreatedRef.current = true` INSIDE the async function.

Timeline:
1. Effect runs
2. Guard check passes (false)
3. Async function starts
4. Before it completes, if props/state change, effect runs again
5. Guard still false (ref not set yet)
6. Creates duplicate session

✅ **Guard is set at start of async function, should prevent duplicates**

### Issue 3: Restoration Effect Condition Too Strict
Line 272: `if (restoredSessionId && restoredSessionId !== 'null' && !sessionId)`

If Terminal already has `sessionId` set (from a previous render or direct initialization), this effect won't run even if `restoredSessionId` changes.

This could be an issue if:
- Terminal component is reused
- Session ID changes between navigations

❓ **Need to verify if Terminal is unmounted/remounted on navigation**

## Testing Plan

### Test 1: First Session Creation
1. Clear localStorage: `localStorage.clear()`
2. Open IDE
3. Expected: New session created, stored in localStorage
4. Console should show: "✅ Session created via REST API: session_..."

### Test 2: Session Restoration After Refresh
1. Keep existing session in localStorage
2. Hard refresh (Cmd+Shift+R)
3. Expected: Same session ID restored
4. Console should show:
   - "🔄 [INIT] Restored terminal session ID: session_..."
   - "🔄 Restoring terminal session ID from navigation: session_..."
   - "🔄 Using existing session ID from prop: session_..."

### Test 3: Session Persistence After Timeline Navigation
1. Open IDE, create session
2. Run commands: `ls`, `pwd`, `echo "test"`
3. Click Timeline button
4. Click IDE button
5. Expected: Same session, all terminal output still visible
6. Console should show same restoration logs as Test 2

### Test 4: Multiple Quick Navigations
1. Open IDE
2. Quickly navigate: IDE → Timeline → IDE → Timeline → IDE
3. Expected: Same session maintained throughout
4. Console should NOT show multiple "Session created" messages
