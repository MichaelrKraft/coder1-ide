# Task: Fix MoltbotBridge WebSocket Port Configuration

## Objective
Fix the MoltbotBridge service to connect to ManusLive on the correct port (18789 instead of 8765).

## Todo Items

- [x] 1. Fix default gateway URL in `moltbot-bridge.ts` (line 78)
  - Change from `ws://localhost:8765` to `ws://localhost:18789`

- [x] 2. Create new API route `app/api/johnny5/connect/route.ts`
  - GET: Return connection status (connected/disconnected, gateway URL, last ping)
  - POST: Trigger connection/reconnection to ManusLive

- [x] 3. Add auto-connect logic
  - Check for `~/.manuslive/config.json` before auto-connecting
  - Add "auto-connect" action that silently skips if ManusLive not configured

## Files Modified
- `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/services/johnny5/moltbot-bridge.ts`
  - Line 78: Changed default port from 8765 to 18789

## Files Created
- `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/app/api/johnny5/connect/route.ts`

## Review

### Summary of Changes

**Fix 1** (`services/johnny5/moltbot-bridge.ts` line 78):
- Changed default gateway URL from `ws://localhost:8765` to `ws://localhost:18789`
- Env var override still works: `MOLTBOT_GATEWAY_URL`

**Fix 2** (New API route `app/api/johnny5/connect/route.ts`):
- **GET /api/johnny5/connect**: Returns connection status including:
  - `connected`: WebSocket connected state
  - `authenticated`: Full handshake complete
  - `gatewayUrl`: Current gateway URL
  - `lastPingAt`/`lastPongAt`: Heartbeat timestamps
  - `manusLiveConfigured`: Whether ~/.manuslive/config.json exists

- **POST /api/johnny5/connect**: Supports actions:
  - `connect`: Connect to ManusLive (fails if not configured)
  - `disconnect`: Disconnect from gateway
  - `reconnect`: Disconnect and reconnect
  - `auto-connect`: Connect only if ManusLive is configured (silent skip if not)

**Fix 3** (Auto-connect logic):
- Added `isManusLiveConfigured()` helper that checks for:
  - `~/.manuslive/config.json`
  - `~/.manuslive/memory.sqlite`
- `auto-connect` action returns success even when skipped (for IDE initialization)

### Verification Commands

```bash
# Check ManusLive is running on correct port
lsof -i :18789

# Test connection API - GET status
curl http://localhost:3001/api/johnny5/connect

# Test connection API - POST auto-connect
curl -X POST http://localhost:3001/api/johnny5/connect \
  -H "Content-Type: application/json" \
  -d '{"action": "auto-connect"}'

# Test connection API - POST explicit connect
curl -X POST http://localhost:3001/api/johnny5/connect \
  -H "Content-Type: application/json" \
  -d '{"action": "connect"}'
```

### Technical Notes

- The API follows existing johnny5 route patterns (Johnny5APIResponse typing)
- Uses the singleton MoltbotBridge instance via `getMoltbotBridge()`
- Auto-connect is safe to call on every IDE load (idempotent)
- Connection errors in auto-connect mode are logged but don't fail the request
