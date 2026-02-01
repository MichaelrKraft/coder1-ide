# Coder1 IDE Development Guide

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (unified mode by default)
npm run dev

# Access the IDE at:
http://localhost:3001/ide
```

## 🏗️ Server Architecture

Coder1 IDE uses a **unified server architecture** that combines all functionality into a single Next.js custom server. This ensures:
- ✅ CSS always loads correctly
- ✅ Terminal always connects properly
- ✅ WebSocket support is guaranteed
- ✅ All features work out of the box

### What is the Unified Server?

The unified server (`server.js`) is a custom Next.js server that handles:
- **Next.js UI**: React pages and components
- **API Routes**: All `/api/*` endpoints
- **Terminal PTY**: Real terminal sessions via `node-pty`
- **WebSocket**: Socket.IO for real-time communication
- **File Operations**: Read/write file system access

### Available Server Modes

| Command | Description | Use Case |
|---------|------------|----------|
| `npm run dev` | **DEFAULT** - Unified server with all features | Normal development |
| `npm run dev:legacy` | Next.js only (NO terminal/WebSocket) | UI-only development |
| `npm run dev:unified` | Same as `npm run dev` | Explicit unified mode |
| `npm run dev:alpha` | Production-optimized with memory limits | Testing production |

## ⚠️ Common Issues & Solutions

### CSS Not Loading

**Symptom**: White unstyled page

**Cause**: Using legacy mode (`npm run dev:legacy`) instead of unified mode

**Solution**: 
```bash
# Stop the server and restart with unified mode
npm run dev
```

### Terminal Shows "Connection lost. Reconnecting..."

**Symptom**: Terminal keeps trying to reconnect

**Cause**: Socket.IO server not running (using legacy mode)

**Solution**:
```bash
# Use the unified server
npm run dev
```

### Port Conflicts

**Symptom**: "Port 3001 already in use"

**Solution**:
```bash
# Kill the process using port 3001
lsof -ti :3001 | xargs kill -9

# Restart
npm run dev
```

### Testing on Different Port

```bash
# Use PORT environment variable
PORT=3002 npm run dev
```

## 🔍 How to Verify Server Mode

When the server starts correctly, you should see:

```
🚀 Coder1 IDE - Unified Server Started
=====================================
📍 Server: http://0.0.0.0:3001
🔌 Socket.IO: ws://0.0.0.0:3001
💻 Terminal: Integrated with PTY
🏠 Environment: Development

IDE Interface: http://localhost:3001/ide
```

If you see only Next.js startup messages without Socket.IO info, you're in the wrong mode!

## 🎯 Development Best Practices

### Always Use Unified Mode
- The default `npm run dev` now uses unified mode
- This prevents CSS and terminal issues
- All features work correctly

### Environment Variables
- Copy `.env.local.example` to `.env.local`
- PORT defaults to 3001
- All services run on the same port

### Testing Changes
1. Make your changes
2. Restart the server: `npm run dev`
3. Test in browser: `http://localhost:3001/ide`
4. Check terminal functionality
5. Verify CSS loads correctly

## 📝 Architecture Details

### File Structure
```
coder1-ide-next/
├── server.js           # Unified custom server
├── app/                # Next.js app directory
│   ├── api/           # API routes
│   └── ide/           # IDE page
├── components/        # React components
│   └── terminal/      # Terminal components
├── lib/              # Utilities
│   └── socket.ts     # Socket.IO client
└── services/         # Backend services
```

### Key Components

**server.js**
- Combines Next.js with Socket.IO
- Manages terminal PTY sessions
- Handles all HTTP and WebSocket traffic

**lib/socket.ts**
- Client-side Socket.IO connection
- Auto-detection of server availability
- Fallback mechanisms

**components/terminal/Terminal.tsx**
- Terminal UI component
- Connects to Socket.IO for PTY
- Handles input/output

## 🐛 Debugging Tips

### Enable Verbose Logging
```bash
DEBUG=* npm run dev
```

### Check Socket.IO Connection
Open browser console and look for:
- "✅ Socket.IO instance obtained: CONNECTED"
- "✅ Using real Socket.IO connection"

### Verify Terminal Session
In browser console:
```javascript
// Check if Socket.IO is connected
window.socket?.connected // Should be true
```

### Monitor Server Logs
Server logs show:
- Terminal session creation
- Socket.IO connections
- API requests

## 🚨 Troubleshooting Checklist

If things aren't working:

1. **Are you using the right command?**
   - ✅ `npm run dev` (correct)
   - ❌ `npm run dev:legacy` (wrong)

2. **Is the port available?**
   ```bash
   lsof -i :3001
   ```

3. **Are dependencies installed?**
   ```bash
   npm install
   ```

4. **Is the server running?**
   Look for "Unified Server Started" message

5. **Can you access the IDE?**
   Visit `http://localhost:3001/ide`

## 📚 Additional Resources

- [README.md](./README.md) - Project overview
- [CLAUDE.md](./CLAUDE.md) - AI agent instructions
- [Terminal Complete Guide](./docs/guides/terminal-complete-guide.md) - Terminal troubleshooting

---

*Last Updated: January 2025*
## 🧪 Advanced Debugging: Resolving "Transport Close" Issues

If you encounter "Connection lost: transport close" errors (typical of Load Balancers like Render/Cloudflare), you can debug locally using our Chaos tools.

### 1. Smart Chaos Proxy (Recommended)
Simulates random `transport close` events on Socket.IO connections while keeping static assets safe.

```bash
# Start the proxy (kills 60% of sockets after 100-800ms)
node debug/smart-chaos-proxy.js

# Access the IDE via the proxy port
http://localhost:3002/ide
```

**What to look for:**
- Terminal should flicker but **recover instantly**.
- Logs should show `🔪 [CHAOS] Killing socket`.
- If terminal hangs with "Connection timeout" (10s), the client-side fix is broken.

### 2. Docker Load Balancer Simulation
Simulates a strict Nginx load balancer with aggressive timeouts.

```bash
cd debug
docker-compose up
# Access at http://localhost:3002
```

Use this to verify `pingInterval` / `pingTimeout` settings against a strict proxy.
