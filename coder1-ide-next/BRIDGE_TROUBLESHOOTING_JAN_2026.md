# Bridge Connection Troubleshooting Guide

**Date**: January 27, 2026
**Issues Fixed**: Claude Code startup, bridge pairing, terminal rendering

---

## Issue 1: Claude Code Takes 45+ Seconds to Start

### Symptoms
- Claude Code CLI takes 45+ seconds to start in Coder1 IDE
- System feels sluggish
- Terminal shows "Eternal memory loaded" then hangs

### Root Cause
Memory pressure from zombie processes causing excessive disk swapping.

### Diagnosis
```bash
# Check memory status
vm_stat | grep -E "Pages free|Pageouts"

# Count node processes (should be <15)
pgrep -l node | wc -l

# Check for duplicate Claude versions
pgrep -l claude
```

### Fix
```bash
# Kill old Claude versions
pkill -f "2.1.20"  # or whatever old version

# Kill duplicate MCP servers
pgrep -f "coder1-intelligence" | head -1 | xargs kill
pgrep -f "filesystem.*dist" | head -1 | xargs kill

# Verify cleanup
pgrep -l node | wc -l  # Should be reduced
```

---

## Issue 2: `posix_spawnp failed` Error

### Symptoms
```
❌ Error: posix_spawnp failed.
❌ Command failed (exit code: 1): posix_spawnp failed.
```

### Root Cause
`node-pty` native binary incompatible with current Node.js version (especially Node v24+).

### Diagnosis
```bash
# Check Node version
node --version

# Check if node-pty binary exists
ls ~/.coder1/lib/node_modules/coder1-bridge/node_modules/node-pty/build/Release/
```

### Fix
```bash
# Rebuild node-pty for current Node version
cd ~/.coder1/lib/node_modules/coder1-bridge/node_modules/node-pty
npx node-gyp rebuild

# Restart Coder1 server to pick up new binary
pkill -f "node server.js"
cd /path/to/coder1-ide-next && PORT=3001 npm run dev
```

---

## Issue 3: Bridge Code Modal Doesn't Auto-Close

### Symptoms
- User enters pairing code in CLI
- Bridge connects successfully
- But the "Bridge Connection Code" modal in IDE doesn't close

### Root Cause
`/api/bridge/status` was checking JWT validation status, not actual WebSocket connection.

### Fix Applied (Jan 27, 2026)
Updated `/app/api/bridge/status/route.ts` to check `bridgeManager` for actual WebSocket connections:

```typescript
// Check actual WebSocket connection via bridgeManager
const bridgeStatus = bridgeManager?.getBridgeStatus?.(userId);

// Fallback: Check if ANY bridge is connected
const anyBridge = bridgeManager?.findAnyConnectedBridge?.();
```

### Files Modified
- `app/api/bridge/status/route.ts`

---

## Issue 4: Claude Code TUI Renders with Wrong Dimensions

### Symptoms
- Claude Code header appears duplicated
- First header is narrow (80 cols), second is full width
- Text wraps incorrectly

### Root Cause
Terminal dimensions not passed to bridge when executing Claude commands.

### Fix Applied (Jan 27, 2026)
Added `cols` and `rows` to the command context in `server.js`:

```javascript
// FIX (Jan 27, 2026): Get terminal dimensions from PTY
const terminalCols = session?.pty?.cols || 120;
const terminalRows = session?.pty?.rows || 30;

const commandRequest = {
  context: {
    cols: terminalCols,
    rows: terminalRows,
    // ... other context
  }
};
```

### Files Modified
- `server.js` (around line 2297)

---

## Quick Diagnostic Commands

```bash
# Check system health
vm_stat | grep "Pages free"
pgrep -l node | wc -l
pgrep -l claude

# Check server status
curl -s http://localhost:3001 -o /dev/null -w "%{http_code}"

# Test bridge API
curl -s "http://localhost:3001/api/bridge/status?userId=test" | jq .

# Generate test pairing code
curl -s -X POST http://localhost:3001/api/bridge/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "test"}' | jq .
```

---

## Server Restart Procedure

```bash
# 1. Stop server
pkill -f "node server.js"

# 2. Wait for cleanup
sleep 2

# 3. Start server
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
PORT=3001 npm run dev

# 4. Verify
sleep 5
curl -s http://localhost:3001 -o /dev/null -w "Status: %{http_code}\n"
```

---

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Main server, terminal handling, bridge routing |
| `services/bridge-manager.ts` | WebSocket bridge connections |
| `app/api/bridge/status/route.ts` | Bridge status API |
| `app/api/bridge/pair/route.ts` | Pairing code validation |
| `bridge-cli/src/claude-executor.js` | Claude CLI execution |
| `components/bridge/BridgeConnectButton.tsx` | Bridge modal UI |

---

**Last Updated**: January 27, 2026
