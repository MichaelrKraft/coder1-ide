# Render Deployment Terminal Diagnostic Guide

## 🚨 Critical Issue: Terminal Not Accepting Input on Render

### Diagnostic Changes Implemented (January 2025)

#### 1. **PTY Compatibility Test** ✅
- **Location**: `server.js` line 53-67
- **Purpose**: Tests if node-pty can spawn on startup
- **Expected Output**: `✅ PTY COMPATIBILITY: Working on this environment`
- **If Failed**: Shows `❌ PTY COMPATIBILITY: Failed` with error message

#### 2. **Socket.IO Connection Logging** ✅
- **Location**: `server.js` lines 539-550
- **Purpose**: Logs detailed connection info for each Socket.IO client
- **Expected Output**:
  ```
  🔌 PRODUCTION SOCKET CONNECTED: [socket-id]
    Transport: polling/websocket
    Remote IP: [ip-address]
    User-Agent: [browser-info]
    PTY Compatible: true/false
  ```

#### 3. **Terminal Event Logging** ✅
- **Location**: `server.js` lines 556-562, 668
- **Purpose**: Logs terminal create and input events
- **Expected Output**:
  ```
  📟 TERMINAL CREATE REQUEST: {sessionId, transport, socketId, ptyCompatible, timestamp}
  ⌨️ TERMINAL INPUT: Session [id], Data length: [n], First char: [code]
  ```

#### 4. **Mock Socket Prevention** ✅
- **Location**: `lib/socket.ts` lines 75-84
- **Purpose**: Prevents fallback to mock socket in production
- **Effect**: Throws error instead of silently failing with mock socket

#### 5. **Render WebSocket Configuration** ✅
- **Location**: `server.js` lines 499-521
- **Purpose**: Adds Render-specific Socket.IO settings
- **Key Settings**:
  - Longer ping timeout (60s)
  - Explicit transport order (polling → websocket)
  - Disabled compression for reliability

#### 6. **Health Check Enhancement** ✅
- **Location**: `server.js` lines 256-299
- **Endpoint**: `/api/health` or `/health`
- **New Fields**:
  - `socketio`: Connection stats and transport info
  - `pty`: Compatibility and platform info

## 🔍 Deployment Checklist

### Before Deployment

1. **Update Build Command on Render**:
   ```bash
   npm run build:render
   ```
   This rebuilds node-pty for Linux environment

2. **Set Environment Variables**:
   - `NODE_ENV=production`
   - `RENDER=true` (if not auto-set)
   - `RENDER_EXTERNAL_URL=[your-app-url]`

3. **Verify Start Command**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=400" node server.js
   ```

### After Deployment

#### Step 1: Check Server Logs
Look for these critical messages:
- `✅ PTY COMPATIBILITY: Working` or `❌ PTY COMPATIBILITY: Failed`
- `🔌 PRODUCTION SOCKET CONNECTED` when you open the IDE
- `📟 TERMINAL CREATE REQUEST` when terminal loads

#### Step 2: Check Health Endpoint
```bash
curl https://your-app.onrender.com/health | jq .
```

Look for:
- `socketio.available: true`
- `socketio.connectedClients > 0` (after opening IDE)
- `pty.compatible: true`

#### Step 3: Browser Console
Open browser DevTools and look for:
- `✅ Using real Socket.IO connection`
- If you see `⚠️ CRITICAL: USING MOCK SOCKET`, Socket.IO failed

#### Step 4: Test Terminal Input
1. Open the IDE
2. Check terminal appears
3. Type a simple command like `echo test`
4. Check server logs for `⌨️ TERMINAL INPUT` messages

## 🎯 Interpreting Results

### Scenario 1: PTY Compatibility Failed
**Server shows**: `❌ PTY COMPATIBILITY: Failed`
**Solution**: 
- Add to Render build command: `apt-get update && apt-get install -y build-essential`
- Use `npm run build:render` which rebuilds node-pty

### Scenario 2: Socket.IO Not Connecting
**Server shows**: No `🔌 PRODUCTION SOCKET CONNECTED` messages
**Browser shows**: `⚠️ CRITICAL: USING MOCK SOCKET`
**Solution**:
- Check Render allows WebSocket connections
- Verify CORS settings include your Render URL
- Check for proxy/firewall issues

### Scenario 3: Terminal Creates But No Input
**Server shows**: `📟 TERMINAL CREATE REQUEST` but no `⌨️ TERMINAL INPUT`
**Solution**:
- Socket.IO events not transmitting properly
- Check transport (should upgrade from polling to websocket)
- May need to stay on polling only

### Scenario 4: Everything Works Locally But Not on Render
**Most likely**: Environment-specific issue
**Solutions**:
1. Binary incompatibility - rebuild node-pty
2. WebSocket blocked - check Render settings
3. Memory constraints - terminal spawn failing

## 🚀 Quick Fix Attempts

### Fix 1: Force Polling Transport Only
In `server.js` line 513:
```javascript
transports: ['polling'] // Remove 'websocket'
```

### Fix 2: Increase Memory for PTY
In `server.js` TerminalSession constructor, add:
```javascript
this.pty = pty.spawn(shell, [], {
  // ... existing config
  handleFlowControl: true,
  flowControlPause: '\x13',
  flowControlResume: '\x11'
});
```

### Fix 3: Add Binary Rebuild to Start Script
Update package.json start script:
```json
"start": "npm rebuild node-pty --update-binary && NODE_ENV=production node server.js"
```

## 📊 Expected Successful Output

When everything works, you should see:

**Server Logs**:
```
✅ PTY COMPATIBILITY: Working on this environment
🔌 PRODUCTION SOCKET CONNECTED: abc123
📟 TERMINAL CREATE REQUEST: {sessionId: "session_123", ...}
⌨️ TERMINAL INPUT: Session session_123, Data length: 1, First char: 116
```

**Browser Console**:
```
✅ Using real Socket.IO connection
✅ SOCKET.IO CONNECTED: {id: "abc123", ...}
```

**Health Check**:
```json
{
  "socketio": {
    "available": true,
    "connectedClients": 1,
    "ptyCompatible": true
  },
  "pty": {
    "compatible": true,
    "platform": "linux"
  }
}
```

## 🆘 If All Else Fails

1. **Disable Terminal Temporarily**: Hide terminal tab, deploy other features
2. **Use Alternative Terminal**: Consider xterm.js with custom WebSocket backend
3. **Split Services**: Deploy terminal service separately on Railway/Fly.io
4. **Contact Render Support**: Ask about WebSocket support and node-pty compatibility

## 📝 Notes for Next Deployment

- All diagnostic code is now in place
- Simply deploy and check logs
- The issue will be immediately apparent from the diagnostic output
- No more guessing - the logs will tell you exactly what's failing

---

*Created: January 2025*  
*Purpose: Diagnose terminal input issue on Render deployment*