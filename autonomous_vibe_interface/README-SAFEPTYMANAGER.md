# SafePTYManager Documentation

## Overview

SafePTYManager is an enterprise-grade terminal session management system designed to prevent PTY (pseudo-terminal) resource exhaustion on macOS systems. It provides robust session lifecycle management, rate limiting, and telemetry.

## Architecture

### Core Components

1. **Session Management**
   - Maximum 5 concurrent terminal sessions
   - Automatic cleanup on disconnect
   - Session ID tracking with UUIDs
   - Graceful handling of orphaned sessions

2. **Rate Limiting**
   - 1 second minimum delay between new session creations
   - Prevents rapid PTY allocation attacks
   - Protects against accidental resource exhaustion

3. **Socket.IO Integration**
   - Full compatibility with frontend Socket.IO clients
   - Replaces incompatible plain WebSocket implementation
   - Runs on port 10000 by default

4. **Telemetry & Monitoring**
   - Session creation/destruction logging
   - Active session count tracking
   - Error reporting with context
   - Performance metrics

## Implementation Details

### File Location
`/Users/michaelkraft/autonomous_vibe_interface/src/routes/terminal-websocket-safepty.js`

### Key Features

```javascript
// Rate limiting
const MIN_SESSION_CREATION_INTERVAL = 1000; // 1 second

// Session limits
const MAX_SESSIONS = 5;

// Automatic cleanup
socket.on('disconnect', () => {
    if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        session.pty.kill();
        sessions.delete(sessionId);
    }
});
```

### Claude Code CLI Support
- Detects Claude Code environment via `CLAUDE_CODE` environment variable
- Optimizes shell configuration for Claude workflows
- Sets appropriate working directory

## Integration

### Server Configuration (app.js)
```javascript
const safeTerminalWebSocket = require('./routes/terminal-websocket-safepty');
safeTerminalWebSocket(io);
```

### Frontend Connection
```javascript
const socket = io('http://localhost:10000', {
    transports: ['websocket'],
    upgrade: false
});
```

## Benefits

1. **Prevents White Screen Crashes**
   - No more PTY exhaustion leading to Tauri app crashes
   - Stable terminal operations under load

2. **Enterprise-Ready**
   - Production-grade error handling
   - Comprehensive logging
   - Graceful degradation

3. **Performance**
   - Minimal overhead
   - Efficient session management
   - Quick cleanup of resources

## Monitoring

### Check Active Sessions
```bash
# View server logs
tail -f /Users/michaelkraft/autonomous_vibe_interface/server.log

# Check PTY usage
ps aux | grep -E "bash|zsh" | wc -l
```

### Health Checks
- Monitor session count doesn't exceed 5
- Verify cleanup on disconnect
- Check for orphaned PTY processes

## Troubleshooting

### Common Issues

1. **"Maximum sessions reached" error**
   - Wait for existing sessions to close
   - Check for orphaned sessions
   - Restart server if necessary

2. **Terminal not connecting**
   - Verify port 10000 is available
   - Check Socket.IO client configuration
   - Ensure server is running

3. **Slow session creation**
   - This is by design (rate limiting)
   - Minimum 1 second between new sessions

## Future Enhancements

1. **Dynamic Session Limits**
   - Adjust based on system resources
   - User-specific quotas

2. **Session Persistence**
   - Reconnect to existing sessions
   - Session state preservation

3. **Advanced Telemetry**
   - Prometheus metrics export
   - Real-time dashboard

## Summary

SafePTYManager successfully resolves the critical PTY exhaustion issue that was causing Tauri desktop app crashes. It provides a robust, production-ready solution for terminal session management with built-in safety mechanisms and comprehensive monitoring capabilities.