# Coder1 IDE Architecture

## 🏗️ Dual-Server Architecture

The Coder1 IDE uses a **dual-server architecture** to provide both modern UI capabilities and robust terminal functionality:

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser (Port 3001)                 │
│                    http://localhost:3001/ide                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│   Next.js Server │        │  Express Server  │
│    (Port 3001)   │◄──────►│   (Port 3000)    │
└──────────────────┘        └──────────────────┘
        │                             │
        ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│   Modern UI      │        │   Terminal PTY   │
│   React Components│       │   WebSocket      │
│   Context API    │        │   File System    │
│   StatusBar      │        │   Original APIs  │
└──────────────────┘        └──────────────────┘
```

## 🎯 Why Two Servers?

### Next.js Server (Port 3001)
**Purpose**: Modern frontend and API routes
- **Serves**: The React-based IDE interface
- **Features**:
  - Modern UI components
  - Context Folders API
  - StatusBar with Brain icon
  - Session management
  - Health checks

### Express Server (Port 3000)
**Purpose**: Terminal and system operations
- **Serves**: Backend services that require Node.js
- **Features**:
  - Terminal PTY (pseudo-terminal)
  - WebSocket connections
  - File system operations
  - Original API endpoints
  - Claude Code integration

## 🔄 Communication Flow

1. **User visits**: `http://localhost:3001/ide`
2. **Next.js serves**: React IDE interface
3. **Terminal connects**: WebSocket to Express (port 3000)
4. **Commands flow**: Browser → Next.js → Express → PTY
5. **Output returns**: PTY → Express → WebSocket → Browser

## 🚀 Starting the IDE

### Method 1: Unified Startup Script (Recommended)
```bash
./start-ide.sh
```
This script:
- Checks port availability
- Starts both servers
- Shows combined logs
- Handles cleanup on exit

### Method 2: Manual Start
```bash
# Terminal 1 - Express Server
npm start

# Terminal 2 - Next.js Server  
cd coder1-ide-next
npm run dev
```

## 🔧 Configuration

### Environment Variables (`.env.local`)
```env
# CRITICAL: Port Configuration
EXPRESS_BACKEND_URL=http://localhost:3000      # Express server
NEXT_PUBLIC_EXPRESS_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001      # Next.js server
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3000  # WebSocket to Express
PORT=3001                                       # Next.js port
```

### Common Issues & Solutions

#### "Terminal session not found"
**Cause**: Terminal trying to connect to wrong port
**Solution**: 
1. Ensure Express server is running on port 3000
2. Check WebSocket URL points to 3000, not 3001

#### Context Folders not showing
**Cause**: Next.js server not running or wrong port
**Solution**:
1. Ensure Next.js is on port 3001
2. Access IDE at `http://localhost:3001/ide`

#### Both servers on same port
**Cause**: Configuration error
**Solution**:
1. Express MUST be on 3000
2. Next.js MUST be on 3001
3. Never swap these ports

## 📊 Health Check

Visit `http://localhost:3001/api/health` to see system status:
```json
{
  "status": "healthy",
  "services": {
    "nextjs": { "status": "running", "port": 3001 },
    "express": { "status": "running", "port": 3000 },
    "terminal": { "status": "running", "sessions": 1 },
    "context": { "status": "learning", "sessions": 21 }
  }
}
```

## 🐛 Debugging

### Check What's Running
```bash
# See what's on port 3000
lsof -i :3000

# See what's on port 3001
lsof -i :3001

# Check health
curl http://localhost:3001/api/health | jq
```

### View Logs
```bash
# If using start-ide.sh
tail -f express.log    # Express server logs
tail -f nextjs.log     # Next.js server logs

# If running manually
# Logs appear in respective terminals
```

## 🏃 Process Management (Optional)

### Using PM2 for Persistent Servers
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Stop all
pm2 stop all
```

### PM2 Configuration (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'express-server',
      script: 'src/app.js',
      cwd: '/Users/michaelkraft/autonomous_vibe_interface',
      env: {
        PORT: 3000,
        NODE_ENV: 'development'
      }
    },
    {
      name: 'nextjs-ide',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next',
      env: {
        PORT: 3001,
        NODE_ENV: 'development'
      }
    }
  ]
};
```

## 📝 Summary

The dual-server architecture is **intentional and required**:
- **Express (3000)**: Handles terminal, WebSockets, file operations
- **Next.js (3001)**: Provides modern UI and Context API
- **They work together**: Cross-port communication is normal
- **Always use port 3001** to access the IDE in your browser

This architecture allows us to leverage the best of both worlds: Next.js for modern UI and Express for system-level operations that React can't handle directly.

---
*Last updated: January 2025*