# AI Team Sub-Agent Terminal Output Fix - November 2025

## Problem Description

When clicking the "AI Team" button to spawn 5 sub-agents, the terminals would initialize and display headers/agent role information, but would never show actual PTY output from the Claude Code CLI instances. The terminals remained blank with no agent activity visible.

**Symptoms:**
- Agent terminals spawn successfully with correct headers
- Agent coordinator logs show tasks being assigned to agents
- Puppeteer system logs show agent processes starting
- **BUT**: No output appears in the terminal displays
- Backend logs show: `📡 Broadcasting to 0 socket(s)` - THE KEY INDICATOR

## Root Cause

A stale compiled JavaScript file at `/services/sandbox/agent-terminal-manager.js` was missing critical session reuse logic that existed in the TypeScript source file `/services/agent-terminal-manager.ts`.

**The Issue:**
1. TypeScript source (`agent-terminal-manager.ts`) had correct logic to **reuse existing sessions** and preserve socket connections
2. Stale compiled JavaScript (`sandbox/agent-terminal-manager.js`) **always created new sessions**, destroying the `connectedSockets` Set
3. When frontend terminals connected via WebSocket, they were added to a session's `connectedSockets` Set
4. When agent output arrived, coordinator called `createAgentTerminalSession()` again
5. The stale .js file created a **brand new session with empty socket Set**, overwriting the one with connections
6. Output broadcast to 0 sockets → terminals remain blank

**Stale JavaScript Code (DELETED):**
```javascript
// ❌ NO SESSION REUSE CHECK - always creates new session!
createAgentTerminalSession(agentId, teamId, role) {
  const session = {
    agentId,
    teamId,
    role,
    terminalBuffer: [],
    lastActivity: new Date(),
    isInteractive: false,
    connectedSockets: new Set() // ❌ Always empty!
  };
  this.sessions.set(agentId, session);
  return session;
}
```

**Correct TypeScript Code:**
```typescript
// ✅ Checks for existing session and preserves sockets
public createAgentTerminalSession(agentId: string, teamId: string, role: string): AgentTerminalSession {
  const existingSession = this.sessions.get(agentId);
  if (existingSession) {
    console.log(`♻️ Agent session ${agentId} already exists - preserving ${existingSession.connectedSockets.size} socket connection(s)`);
    return existingSession;
  }
  
  const session: AgentTerminalSession = {
    agentId,
    teamId,
    role,
    terminalBuffer: [],
    lastActivity: new Date(),
    isInteractive: false,
    connectedSockets: new Set()
  };
  
  this.sessions.set(agentId, session);
  return session;
}
```

## Solution Applied

**Fix:** Delete the stale compiled JavaScript file to force Next.js to compile from TypeScript source.

```bash
rm /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/services/sandbox/agent-terminal-manager.js
```

**Why This Works:**
- Next.js dev mode compiles TypeScript files on-demand
- With stale .js file gone, Node.js is forced to use the TypeScript source
- Correct session reuse logic now executes
- Socket connections are preserved across coordinator calls
- Agent output broadcasts to connected terminals

## Files Affected

### Modified/Critical Files:
- `/services/agent-terminal-manager.ts` - **Correct TypeScript source** with session reuse logic
- `/services/sandbox/agent-terminal-manager.js` - **DELETED** (stale compiled version causing the bug)
- `/services/agent-coordinator.js` - Routes agent PTY output to terminal manager
- `/server.js` - Imports agent terminal manager with `.ts` extension

### Key Code Flow:

1. **Terminal Connection** (`/services/agent-terminal-manager.ts` lines 133-145):
```typescript
public addSocketToAgent(agentId: string, socket: any): void {
  const session = this.sessions.get(agentId);
  if (!session) {
    console.warn(`⚠️ No terminal session for agent: ${agentId}`);
    return;
  }
  
  session.connectedSockets.add(socket);
  console.log(`✅ Socket ${socket.id} ADDED to ${agentId} - Set size now: ${session.connectedSockets.size}`);
}
```

2. **Output Broadcasting** (`/services/agent-terminal-manager.ts` lines 176-219):
```typescript
public appendToAgentTerminal(agentId: string, data: string): void {
  const session = this.sessions.get(agentId);
  if (!session) {
    console.warn(`⚠️ No terminal session for agent: ${agentId}`);
    return;
  }
  
  session.terminalBuffer.push(data);
  
  console.log(`📤 Broadcasting to ${session.connectedSockets.size} socket(s) for agent ${agentId}`);
  session.connectedSockets.forEach(socket => {
    if (socket.connected) {
      socket.emit('agent:terminal:data', { agentId, data });
    }
  });
  
  if (session.connectedSockets.size === 0) {
    console.error(`❌ NO SOCKETS CONNECTED for agent ${agentId} - data will be lost!`);
  }
}
```

3. **Agent Output Routing** (`/services/agent-coordinator.js` lines 86-107):
```javascript
this.puppeteer.on('agentOutput', ({ agentId, output, timestamp }) => {
  if (this.agentTerminalManager) {
    console.log(`📺 Routing output from ${agentId} to terminal manager`);
    this.agentTerminalManager.appendToAgentTerminal(agentId, output);
  }
});
```

## Verification

### Success Indicators:
Look for these log messages in the server console:

**✅ GOOD (Fix is working):**
```
✅ [ATM-1763673606325-vqfz1oyyd] Socket O-_x2o-kAUgc8UQhAAAD ADDED to setup-agent-1 - Set size now: 1
♻️ [ATM-1763673606325-vqfz1oyyd] Agent session setup-agent-1 already exists - preserving 1 socket connection(s)
📤 [ATM-1763673606325-vqfz1oyyd] Broadcasting to 1 socket(s) for agent setup-agent-1, data length: 45
```

**❌ BAD (Stale .js file still present):**
```
📡 Broadcasting to 0 socket(s) for agent setup-agent-1
❌ NO SOCKETS CONNECTED for agent setup-agent-1 - data will be lost!
```

### Testing Steps:
1. Start server: `npm run dev`
2. Click "AI Team" button in IDE
3. Observe 5 agent terminals spawn
4. Check server logs for socket connection messages
5. Verify agent terminals display live output from Claude Code CLI

## Prevention

### Add to `.gitignore`:
```gitignore
# Exclude compiled JavaScript artifacts from TypeScript source
/services/**/*.js
/services/**/*.js.map
```

### Why This Matters:
- Next.js compiles TypeScript files during development
- Compiled artifacts can become stale when source is updated
- Git tracking compiled files creates synchronization issues
- Best practice: Only track source files, ignore build artifacts

### Future Development:
- Always edit TypeScript source files (`.ts`, `.tsx`)
- Never manually edit compiled JavaScript files (`.js`)
- If terminals show blank output, check for stale compiled files
- Look for "Broadcasting to 0 sockets" as the key diagnostic

## Additional Fixes Applied During Investigation

While investigating the terminal output issue, several related problems were discovered and fixed:

### 1. Memory Management
**Problem:** Server crash with exit code 137 (SIGKILL - out of memory) when running 5 Claude CLI instances simultaneously.

**Fix:** Reduced `MAX_PARALLEL_AGENTS` from 10 to 2 in `.env.local`.

### 2. Agent Duplicate Creation
**Problem:** `Error: Agent session_XXX-architect already exists` when coordinator tried to create agents that terminal manager already created.

**Fix:** Modified `/services/claude-cli-puppeteer.js` line 215-216 to return existing agent instead of throwing error:
```javascript
if (this.agents.has(agentId)) {
  console.log(`♻️ Agent ${agentId} already exists - reusing existing agent`);
  return this.agents.get(agentId);
}
```

### 3. OAuth Configuration
**Problem:** User needed to configure OAuth token for real agent spawning (not just fallback/mock agents).

**Fix:** Added to `.env.local`:
```bash
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-***
```

### 4. Git Repository Path
**Problem:** Bridge service looking for `.git` in `/coder1-ide-next/` but it's in parent directory `/autonomous_vibe_interface/`.

**Fix:** Added to `.env.local`:
```bash
PROJECT_ROOT=/Users/michaelkraft/autonomous_vibe_interface
```

## Related Issues (Not Part of This Fix)

### Claude Code Bridge Service Initialization
**Status:** Identified but separate issue from terminal output fix.

**Symptoms:**
- Module import errors: `Cannot find module './claude-code-bridge'`
- Service not initializing on startup
- Fallback/mock agents instead of real ones

**Likely Cause:** Same root cause as terminal fix - stale compiled JavaScript files in `/services/sandbox/`.

**Recommended Fix:** Delete all stale `.js` files in `/services/sandbox/` directory.

## Summary

**Problem:** Agent terminals spawned but showed no output ("Broadcasting to 0 sockets").

**Root Cause:** Stale compiled JavaScript missing session reuse logic, destroying socket connections.

**Solution:** Delete stale `/services/sandbox/agent-terminal-manager.js` file.

**Result:** ✅ Agent terminals now display live PTY output from Claude Code CLI instances.

**Prevention:** Add `/services/**/*.js` to `.gitignore` to exclude compiled artifacts.

---

**Fixed By:** Claude Code Agent - November 2025  
**Issue:** AI Team Sub-Agent Terminal Output  
**Status:** ✅ SOLVED
