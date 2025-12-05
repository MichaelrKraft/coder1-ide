# Bridge CLI Transport Fix - December 4, 2025

## Summary

Fixed critical connection stability issue causing "transport close" disconnects for alpha users.

## Root Cause

The packaged `bridge-cli.tar.gz` had outdated Socket.IO transport configuration:

```javascript
// BEFORE (broken):
transports: ['websocket']  // WebSocket only, no fallback

// AFTER (fixed):
transports: ['polling', 'websocket']  // Start with polling, upgrade to WebSocket
```

This mismatch with the server (which expects `['polling', 'websocket']`) caused instability on Render's load-balanced infrastructure.

## Files Changed

1. **`/bridge-cli/package/src/bridge-client.js`** - Updated Socket.IO config
2. **`/bridge-cli/package/package.json`** - Version bumped to `1.0.1`
3. **`/public/bridge-cli.tar.gz`** - Rebuilt with fix

## Socket.IO Configuration (Fixed)

```javascript
this.socket = io(`${this.serverUrl}/bridge`, {
  auth: { token: this.token },
  transports: ['polling', 'websocket'], // Matches server config
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  reconnectionAttempts: this.maxReconnectAttempts,
  upgrade: true,           // Allow upgrade from polling to websocket
  rememberUpgrade: true,   // Remember successful upgrades
  timeout: 45000,          // Match server connectTimeout
  pingTimeout: 120000,     // 2 minutes
  pingInterval: 25000      // 25 seconds
});
```

## User Reinstall Instructions

```bash
npm uninstall -g coder1-bridge
npm cache clean --force
npm install -g https://coder1.ai/bridge-cli.tar.gz
coder1-bridge start
```

## Why This Fix Works

1. **Transport compatibility**: Client and server now use same transport strategy
2. **Fallback mechanism**: If WebSocket fails, polling provides backup
3. **Render compatibility**: Polling works reliably on load-balanced infrastructure
4. **Enhanced timeouts**: Generous timeouts prevent spurious disconnects

## Version History

- `1.0.0` - Original release (WebSocket only - unstable on Render)
- `1.0.1` - Transport fix (polling + WebSocket - stable)

## Related Files

- `CRITICAL_FIX_HISTORY.md` - Previous fix documentation
- `ALPHA_USER_FIX_NOV25_2025.md` - Previous alpha user issues
- `DEPLOYMENT_SUMMARY.md` - Deployment process documentation

## Commit

```
3ceeacd3a - Fix bridge-cli transport config for stable connections
```
