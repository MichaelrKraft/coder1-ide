# Phase 3: MoltbotBridge Connection Verification and Fixes

## Summary
Verify and fix the MoltbotBridge connection between Coder1 IDE and ManusLive gateway.

## Issues Found

### Issue 1: Compiled JS has different default gateway URL than TypeScript source
**Status**: FIXED
**Location**: `services/johnny5/moltbot-bridge.js` line 77 vs `services/johnny5/moltbot-bridge.ts` line 78
- TypeScript: `gatewayUrl: process.env.MOLTBOT_GATEWAY_URL || 'ws://localhost:18789'`
- Compiled JS: `gatewayUrl: process.env.MOLTBOT_GATEWAY_URL || 'ws://localhost:8765'`
- **Fix**: Removed outdated compiled .js files. Server now loads .ts directly via tsx.

### Issue 2: Server.js loads the .js file instead of .ts
**Status**: FIXED
**Location**: `server.js` line 206
- **Changed**: `require('./services/johnny5/moltbot-bridge.js')` -> `require('./services/johnny5/moltbot-bridge.ts')`
- Added auto-connect logic when MOLTBOT_ENABLED=true and MOLTBOT_GATEWAY_URL is set.

### Issue 3: Chat API route uses Bridge CLI service instead of MoltbotBridge
**Status**: FIXED
**Location**: `app/api/johnny5/chat/route.ts`
- **Created**: New Moltbot-specific route at `/api/johnny5/moltbot/chat/route.ts`
- **Updated**: ChatTab component to prefer Moltbot when connected, fall back to Bridge CLI.

### Issue 4: deliver parameter mismatch in compiled JS vs TS
**Status**: FIXED
- **Fix**: Removed outdated compiled .js files. TypeScript version has correct `deliver: true`.

### Issue 5: Missing extractTextContent helper in compiled JS
**Status**: FIXED
- **Fix**: Removed outdated compiled .js files. TypeScript version has the helper.

### Issue 6: Missing MOLTBOT_AUTH_TOKEN environment variable documentation
**Status**: FIXED
**Location**: `.env.local.example`
- **Added**: `MOLTBOT_AUTH_TOKEN=` with explanation.

## Tasks

- [x] 1. Analyze current moltbot-bridge implementation
- [x] 2. Remove outdated compiled .js files (server loads .ts directly)
- [x] 3. Update server.js to load .ts file and auto-connect when enabled
- [x] 4. Create a separate Moltbot chat route that uses MoltbotBridge
- [x] 5. Add MOLTBOT_AUTH_TOKEN to .env.local.example
- [x] 6. Create a test script to verify the connection
- [x] 7. Update ChatTab to prefer Moltbot when connected

## Files Modified

1. `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/server.js`
   - Changed import from .js to .ts
   - Added auto-connect logic for Moltbot on server start

2. `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/.env.local.example`
   - Added MOLTBOT_AUTH_TOKEN documentation

3. `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/app/api/johnny5/moltbot/chat/route.ts` (NEW)
   - New API route for Moltbot-specific chat

4. `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/scripts/test-moltbot-connection.ts` (NEW)
   - Test script to verify WebSocket connection to ManusLive

5. `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/components/johnny5/chat/ChatTab.tsx`
   - Updated to prefer Moltbot when connected, fall back to Bridge CLI

## Files Removed

1. `services/johnny5/moltbot-bridge.js` - Outdated compiled file
2. `services/johnny5/moltbot-bridge.d.ts` - Outdated type declarations
3. `services/johnny5/services/` - Nested directory with duplicate compiled files

## Review

### Changes Made
- **Server initialization**: Now properly loads TypeScript moltbot-bridge.ts via tsx loader
- **Auto-connect**: Server will automatically connect to Moltbot gateway on startup when enabled
- **API routes**: New dedicated Moltbot chat route at `/api/johnny5/moltbot/chat`
- **Frontend**: ChatTab automatically selects the right backend based on connection status
- **Documentation**: Auth token is now documented in .env.local.example
- **Test script**: New test script to verify connection independently

### How to Use
1. Set environment variables in `.env.local`:
   ```
   MOLTBOT_ENABLED=true
   MOLTBOT_GATEWAY_URL=ws://192.168.1.x:18789
   MOLTBOT_AUTH_TOKEN=your-token-from-manuslive
   ```

2. Restart the Coder1 IDE server:
   ```bash
   npm run dev
   ```

3. Verify connection with test script:
   ```bash
   npx tsx scripts/test-moltbot-connection.ts
   ```

4. Open Johnny5 dashboard - chat will automatically use Moltbot when connected.

### What Still Needs to Be Done
- Test end-to-end with actual ManusLive instance
- Verify authentication flow works correctly
- Add UI indicator showing which backend is being used
