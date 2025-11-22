# Agent Terminal Retry Fix - November 21, 2025

## Problem
Agent terminal tabs showed only "bash-3.2$" initialization message but no Claude CLI output streaming from sub-agents.

## Root Cause Analysis (Ultrathink)

### The Flow
1. Frontend emits `agent:terminal:connect` with `agentSession.id`
2. Backend `connectSocket()` returns `false` if session doesn't exist → socket queued
3. Server emits `agent:terminal:error` to frontend
4. Frontend had **NO RETRY LOGIC** - it gave up immediately
5. Later, `createAgentTerminalSession()` is called → should flush queue
6. But socket might be disconnected by then, or frontend stopped listening

### Key Finding
The pending connection queue in `agent-terminal-manager.ts` works correctly, but the frontend:
- Didn't listen for `agent:terminal:connected` or `agent:terminal:error` responses
- Had no retry mechanism when the session wasn't ready yet

## Fix Implemented

### File: `/components/terminal/Terminal.tsx` (lines 2260-2337)

**Before:**
```typescript
const connectToAgentTerminal = () => {
  if (socket.connected) {
    socket.emit('agent:terminal:connect', { agentId: agentSession.id });
  }
};
connectToAgentTerminal();
// No response handling, no retry
```

**After:**
```typescript
let retryCount = 0;
const maxRetries = 15;
const retryDelay = 1000;
let isConnectedToAgent = false;

const attemptConnect = () => {
  if (isConnectedToAgent) return;
  if (!socket.connected) {
    socket.once('connect', attemptConnect);
    return;
  }
  console.log(`📤 Emitting agent:terminal:connect for: ${agentSession.id} (attempt ${retryCount + 1}/${maxRetries})`);
  socket.emit('agent:terminal:connect', { agentId: agentSession.id });
};

// Handle successful connection
const onConnected = ({ agentId }) => {
  if (agentId === agentSession.id) {
    isConnectedToAgent = true;
    if (retryTimeoutRef) clearTimeout(retryTimeoutRef);
    console.log('✅ Successfully connected to agent terminal:', agentId);
  }
};

// Handle error - retry until session exists
const onError = ({ agentId, message }) => {
  if (agentId === agentSession.id && !isConnectedToAgent) {
    retryCount++;
    if (retryCount < maxRetries) {
      console.log(`⏳ Agent terminal session not ready, retrying in ${retryDelay}ms... (${retryCount}/${maxRetries})`);
      retryTimeoutRef = setTimeout(attemptConnect, retryDelay);
    }
  }
};

socket.on('agent:terminal:connected', onConnected);
socket.on('agent:terminal:error', onError);
attemptConnect();
```

### Cleanup Also Updated
Added proper cleanup for retry timeout and new listeners:
```typescript
return () => {
  if (retryTimeoutRef) {
    clearTimeout(retryTimeoutRef);
    retryTimeoutRef = null;
  }
  if (agentSocketRef) {
    agentSocketRef.off('agent:terminal:connected');
    agentSocketRef.off('agent:terminal:error');
    agentSocketRef.off('agent:terminal:pending');
    // ... existing cleanup
  }
};
```

## Expected Behavior After Fix

### Server Logs
```
📤 Emitting agent:terminal:connect for: team-XXX-frontend (attempt 1/15)
🔌 [DEBUG] Received agent:terminal:connect for agentId: team-XXX-frontend
⏳ Session not ready for team-XXX-frontend, queueing socket connection
❌ [DEBUG] Session not found, emitting error
⏳ Agent terminal session not ready, retrying in 1000ms... (1/15)
... (retries)
🤖 Created NEW agent terminal session: team-XXX-frontend
🔌 Flushing 1 pending connection(s) for team-XXX-frontend
✅ Successfully connected to agent terminal: team-XXX-frontend
📤 Broadcasting to 1 socket(s) for agent team-XXX-frontend
```

### Browser Console
```
📤 Emitting agent:terminal:connect for: team-XXX-frontend (attempt 1/15)
⏳ Agent terminal session not ready, retrying in 1000ms... (1/15) - Agent terminal session not found
📤 Emitting agent:terminal:connect for: team-XXX-frontend (attempt 2/15)
✅ Successfully connected to agent terminal: team-XXX-frontend
📡 [AGENT-DATA] Received broadcast: ...
✅ [AGENT-DATA] Filter passed! Writing N chars to terminal
```

## Why This Fix Works

1. **Retry Logic**: Frontend keeps trying until session exists (up to 15 seconds)
2. **Response Handling**: Frontend listens for `connected`/`error` events
3. **Buffer Playback**: Once connected, buffered history is sent automatically
4. **Race Condition Tolerance**: Works regardless of timing between spawn API and session creation

## Testing

To verify the fix works:
1. Open http://localhost:3001/ide
2. Click AI Team button in StatusBar
3. Click on an agent tab (e.g., "Frontend Developer")
4. Watch browser console for retry logs
5. Terminal should show Claude CLI output after connection succeeds

---

**Fix Date**: November 21, 2025
**Files Modified**: `/components/terminal/Terminal.tsx`
**Lines Changed**: 2260-2337 (retry logic), 2319-2337 (cleanup)

---

## Additional Fix: Requirement Extraction Garbage Filter

### Problem (Part 2)
After fixing the socket retry, sub-agent terminals showed "mock demonstration" because:
- Server received garbage requirement: `"Frontend Developer────────────────Role: frontend..."`
- This triggered `Project requirement is too long (max 1000 characters)` error
- Claude Code Bridge fell back to mock/fallback mode

### Root Cause
Terminal UI decorations (box-drawing chars, agent metadata) were somehow captured as `terminal_input` in the buffer, polluting requirement extraction.

### Fix
Added filter in `/lib/requirement-extractor.ts` (lines 68-79):
```typescript
.filter(input => {
  // 🔧 FIX (Nov 21, 2025): Skip terminal UI decorations that got captured as input
  const content = input.content;
  const hasBoxDrawing = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]/.test(content);
  const looksLikeAgentUI = /Role:\s*\w+|Team:\s*team-|Current Task:|Agent initialized/.test(content);
  if (hasBoxDrawing || looksLikeAgentUI) {
    console.log('[Requirement Extractor] Filtering out terminal UI decoration:', content.substring(0, 50));
    return false;
  }
  return true;
});
```

### Result
Extraction now filters out:
- Box-drawing characters (─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬)
- Agent UI text patterns (Role:, Team:, Current Task:, Agent initialized)
