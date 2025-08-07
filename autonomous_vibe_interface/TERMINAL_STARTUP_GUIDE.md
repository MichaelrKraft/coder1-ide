# Terminal Integration Startup Guide

## Current Status
✅ PTY creation is working after system restart
✅ Code review complete - all terminal components are in place
✅ Server startup script created

## Next Steps

### 1. Start the Backend Server
Open a new terminal and run:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
./start-server.sh
```

The server will start on port 10000. You should see:
- "Starting server with Node v20.19.3"
- "Server listening on http://localhost:10000"
- Health check endpoint: http://localhost:10000/health

### 2. Test Terminal API (Optional)
In another terminal:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
source ~/.nvm/nvm.sh && nvm use v20.19.3
node test-terminal-api.js
```

This will test:
- PTY creation
- Session management
- Command execution
- Output retrieval

### 3. Start the Tauri App
In another terminal:
```bash
cd /Users/michaelkraft/coder1-ide-v2
npm run tauri:dev
```

The IDE will open at http://localhost:5173/

### 4. Test Terminal in IDE
1. The terminal should show "🟢 Connected"
2. You should see a shell prompt (e.g., `bash-3.2$` or `michaelkraft@...`)
3. Try typing commands:
   - `echo "Hello World"`
   - `ls`
   - `claude` (to start Claude Code CLI)

## Troubleshooting

### If terminal shows "Disconnected":
1. Check server is running: `curl http://localhost:10000/health`
2. Check browser console for WebSocket errors
3. Check server logs for PTY creation errors

### If keyboard input doesn't work:
1. Click on the terminal to focus it
2. Check browser console for input event errors
3. Verify WebSocket messages are being sent

### If PTY creation fails:
1. Ensure using Node v20.19.3: `node --version`
2. Check system resources: `ulimit -n`
3. Try the test script: `node test-pty.js`

## Architecture Summary

1. **Backend (Port 10000)**:
   - REST API: `/api/terminal-rest/sessions` - Creates PTY sessions
   - WebSocket: `/terminal/:sessionId` - Real-time terminal I/O
   - Rate limiting configured to allow terminal endpoints

2. **Frontend (Tauri App)**:
   - BackendTerminal component in coder1-ide-v2
   - Uses xterm.js for terminal rendering
   - WebSocket connection for real-time updates

3. **Key Files**:
   - `/src/routes/terminal-rest.js` - REST endpoints
   - `/src/routes/terminal-websocket.js` - WebSocket handler
   - `/src/app.js` - Server setup and routing

## Success Indicators
- ✅ PTY process spawns with PID
- ✅ WebSocket connects without errors
- ✅ Terminal displays shell prompt
- ✅ Keyboard input is accepted
- ✅ Commands execute and show output
- ✅ Claude Code CLI can be launched