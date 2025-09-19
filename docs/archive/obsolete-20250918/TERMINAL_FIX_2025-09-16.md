# Terminal WebSocket Connection Fix

## Issue
Terminal showing "⚠️ Connection lost. Reconnecting..." error when using `npm run dev`.

## Root Cause
The default `npm run dev` command was starting Next.js development server without the unified server's WebSocket/Socket.IO integration required for terminal functionality.

## Solution
Changed `package.json` to make the unified server (with WebSocket support) the default for development:

```json
// Before:
"dev": "next dev",

// After:
"dev": "node server.js",
```

## Commands
- `npm run dev` - Now starts unified server with terminal support (default)
- `npm run dev:legacy` - Original Next.js dev server (no terminal)
- `npm run dev:unified` - Explicit unified server (same as dev now)

## Verification
The terminal now works correctly with `npm run dev` because it starts the unified server which includes:
- Socket.IO WebSocket server
- PTY terminal sessions
- Proper REST/WebSocket coordination

## Important Note
Always use `npm run dev` (or `npm run dev:unified`) for development to ensure terminal functionality works correctly.

---
*Fixed: September 16, 2025*