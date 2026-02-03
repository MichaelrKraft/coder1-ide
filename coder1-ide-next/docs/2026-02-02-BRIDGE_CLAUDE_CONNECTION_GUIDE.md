# Bridge & Claude Code Connection Guide

**Last Updated:** February 2, 2026
**Status:** Production-tested and working

This document summarizes everything learned about connecting Claude Code through the Coder1 IDE bridge system, including common issues and their solutions.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Coder1 IDE (Next.js)                        │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │    │
│  │  │   Monaco    │  │   xterm.js  │  │  Status Bar     │  │    │
│  │  │   Editor    │  │   Terminal  │  │  (Bridge btn)   │  │    │
│  │  └─────────────┘  └──────┬──────┘  └────────┬────────┘  │    │
│  └──────────────────────────┼──────────────────┼───────────┘    │
└─────────────────────────────┼──────────────────┼────────────────┘
                              │ WebSocket        │ HTTP
                              ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RENDER.COM SERVER                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              server.js (Socket.IO)                       │    │
│  │  - Handles pairing codes                                 │    │
│  │  - Routes terminal I/O to/from bridge                    │    │
│  │  - Manages bridge connections via bridgeManager          │    │
│  └──────────────────────────┬──────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────┘
                              │ WebSocket (WSS)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S LOCAL MACHINE                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              bridge-cli (Node.js)                        │    │
│  │  - src/index.js: Entry point, pairing flow               │    │
│  │  - src/claude-executor.js: Spawns Claude via PTY         │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                              │ PTY (node-pty)                    │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Claude Code CLI                             │    │
│  │  - Interactive terminal session                          │    │
│  │  - Full Claude welcome screen                            │    │
│  │  - All claude commands work                              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| server.js | `coder1-ide-next/server.js` | WebSocket server, routes commands |
| bridge-cli | `coder1-ide-next/bridge-cli/` | Runs on user's machine |
| claude-executor.js | `bridge-cli/src/claude-executor.js` | Spawns Claude via PTY |
| bridgeManager | `coder1-ide-next/services/bridge-manager.ts` | Tracks WebSocket connections |
| Status endpoint | `app/api/bridge/status/route.ts` | Returns bridge connection status |

---

## The Connection Flow

1. **User visits IDE** at https://coder1.ai/ide
2. **User clicks "Bridge" button** → generates 6-digit pairing code
3. **User runs install command** in their local terminal:
   ```bash
   curl -sL https://coder1.ai/install-bridge.sh | bash -s -- --auto-start
   ```
4. **Bridge prompts for code** → user enters 6-digit code
5. **WebSocket connection established** between bridge and server
6. **User types `claude` in IDE terminal** → command routed to bridge
7. **Bridge spawns Claude via PTY** → interactive session begins
8. **Output streamed back** to IDE terminal via WebSocket

---

## Critical Issues & Solutions

### Issue 1: Node.js Version Compatibility (CRITICAL)

**Symptom:** PTY_SPAWN_FAILED error, Claude exits immediately with code 1

**Root Cause:** node-pty requires native compilation. Node.js 23+ (especially v24) has compatibility issues with the prebuilt binaries.

**Error Example:**
```
Error: spawn UNKNOWN
    at ChildProcess.spawn (internal/child_process.js:...)
Error: PTY_SPAWN_FAILED
```

**Solution:**
```bash
# Install Node 20 LTS via nvm
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x.x

# Reinstall bridge
cd bridge-cli
npm install
```

**Prevention:** The install script (`public/install-bridge.sh`) now warns users if they have Node 23+:
```bash
# Warning shown to users with Node 23+
⚠️  Node.js v24.x detected - may have compatibility issues
   node-pty works best with Node 18-22
   If you encounter issues, use Node 20 LTS:
   nvm install 20 && nvm use 20
```

---

### Issue 2: spawn-helper Not Executable

**Symptom:** `posix_spawnp failed` error

**Root Cause:** After `npm install`, the spawn-helper binary in node-pty prebuilds may not have execute permissions.

**Solution:**
```bash
chmod +x bridge-cli/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
# Or for Intel Mac:
chmod +x bridge-cli/node_modules/node-pty/prebuilds/darwin-x64/spawn-helper
```

---

### Issue 3: Stale "Bridge Already Connected" Status

**Symptom:** IDE shows "Bridge already connected" but commands fail with "No bridge connected"

**Root Cause:** Legacy `activeBridges` Map in `app/api/bridge/pair/route.ts` tracked JWT validation but never cleaned up on WebSocket disconnect. The status endpoint had a fallback that used this stale data.

**Solution:** Removed the legacy fallback from `app/api/bridge/status/route.ts`:
```typescript
// REMOVED (Feb 2026): activeBridges was causing stale connection status
// Only bridgeManager tracks real WebSocket connections now

// Now only uses bridgeManager.getBridgeStatus() and findAnyConnectedBridge()
```

**Key Insight:** Only `bridgeManager` (in `services/bridge-manager.ts`) tracks actual WebSocket connections. The `activeBridges` Map only tracked JWT validation and should NOT be used for status checks.

---

### Issue 4: Working Directory Mismatch

**Symptom:** Claude starts but immediately exits with code 1

**Root Cause:** Server (running on Render.com) sent its own `process.cwd()` (e.g., `/project/src/coder1-ide-next`) to the bridge. This path doesn't exist on the user's local machine, so Claude fails to start.

**Solution:**

In `server.js` (line ~2409):
```javascript
// FIX (Feb 2026): Send '~' so bridge uses user's home dir, not Render's cwd
workingDirectory: '~',
```

In `bridge-cli/src/claude-executor.js` (line ~316-320):
```javascript
// FIX (Feb 2026): Handle '~' placeholder from server - use user's home directory
const resolvedCwd = (options.context?.workingDirectory === '~' || !options.context?.workingDirectory)
  ? (process.env.HOME || process.cwd())
  : options.context.workingDirectory;
```

---

## Troubleshooting Checklist

When users report Claude not working in the IDE terminal:

### 1. Check Node Version
```bash
node --version
# Must be v18-v22. If v23+, switch to v20:
nvm use 20
```

### 2. Check Claude CLI is Installed
```bash
which claude
claude --version
```

### 3. Run Bridge Diagnostics
```bash
coder1-bridge diagnose
coder1-bridge test
```

### 4. Check Bridge Logs
Look for errors in the terminal where bridge is running:
- `PTY_SPAWN_FAILED` → Node version issue
- `posix_spawnp failed` → spawn-helper permissions
- `ENOENT` → Working directory doesn't exist

### 5. Verify WebSocket Connection
In browser console:
```javascript
// Check if socket is connected
window.__socket?.connected  // Should be true
```

### 6. Check Server Logs (Render.com)
Look for:
- `Bridge connected for user: ...`
- `claude:execute` events
- Any error messages

---

## Files Modified in Feb 2026 Fixes

| File | Change |
|------|--------|
| `app/api/bridge/status/route.ts` | Removed legacy activeBridges fallback |
| `server.js` | Changed workingDirectory from `process.cwd()` to `'~'` |
| `bridge-cli/src/claude-executor.js` | Resolve `'~'` to `$HOME` |
| `public/install-bridge.sh` | Added Node 23+ compatibility warning |

---

## Testing the Full Flow

1. **Start dev server:**
   ```bash
   cd coder1-ide-next
   npm run dev
   ```

2. **Start bridge with Node 20:**
   ```bash
   export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 20
   cd bridge-cli
   node src/index.js start --dev
   ```

3. **Get pairing code** from IDE at http://localhost:3001/ide

4. **Enter code** in bridge terminal

5. **Type `claude`** in IDE terminal → should see Claude welcome screen

---

## Common Error Messages & Meanings

| Error | Meaning | Fix |
|-------|---------|-----|
| `PTY_SPAWN_FAILED` | node-pty can't spawn process | Use Node 20, check spawn-helper permissions |
| `posix_spawnp failed` | spawn-helper not executable | `chmod +x spawn-helper` |
| `Bridge already connected` | Stale status data | Fixed in code; restart bridge |
| `No bridge connected` | WebSocket not established | Check bridge is running, re-enter pairing code |
| `Command failed: claude` | Claude CLI not found | Install Claude CLI |
| Exit code 1 immediately | Working dir doesn't exist | Fixed in code; was server cwd issue |

---

## Architecture Decisions

### Why PTY Instead of child_process.spawn?

Claude Code requires a real terminal (PTY) for:
- Interactive welcome screen with keyboard navigation
- ANSI color codes and formatting
- Real-time streaming output
- Ctrl+C and signal handling

Using `child_process.spawn` loses all interactivity - no welcome screen, no real-time output.

### Why Bridge on User's Machine?

1. **Security:** User's files never leave their machine
2. **Performance:** No file upload/download latency
3. **Authentication:** Claude CLI uses user's own API key/OAuth
4. **Full Access:** Bridge has same permissions as user's terminal

### Why WebSocket Instead of HTTP?

1. **Bidirectional:** Server can push output to client
2. **Low Latency:** Real-time terminal streaming
3. **Persistent:** Single connection for entire session
4. **Efficient:** No HTTP overhead per message

---

## Related Documentation

- `CLAUDE.md` - Project overview and quick start
- `bridge-cli/README.md` - Bridge CLI documentation
- `bridge-cli/BRIDGE-USER-GUIDE.md` - User-facing guide
- `docs/sessions/SESSION_2025-12-03_BRIDGE_CLAUDE_ROUTING_FIX.md` - Earlier fixes

---

## Summary

The bridge system works when:
1. User has **Node 18-22** (not 23+)
2. **spawn-helper** has execute permissions
3. Server sends **`'~'`** as working directory (not its own cwd)
4. Status endpoint uses **bridgeManager** only (not legacy activeBridges)
5. WebSocket connection is **active** between bridge and server

If Claude won't start in the IDE terminal, check these five things in order.
