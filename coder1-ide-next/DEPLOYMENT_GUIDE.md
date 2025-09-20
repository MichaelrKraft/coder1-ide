# 🚀 Coder1 Deployment Guide for Render

## Quick Deploy Steps

### 1. Push to GitHub
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git add .
git commit -m "feat: Add Coder1 Bridge System for alpha testing"
git push origin refactor/clean-phase1
```

### 2. Configure Render

#### Create New Web Service
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repo: `MichaelrKraft/coder1-ide`
4. Select branch: `refactor/clean-phase1`

#### Build & Deploy Settings
```yaml
Name: coder1-ide
Region: Oregon (US West)
Branch: refactor/clean-phase1
Root Directory: coder1-ide-next

Build Command: npm install && npm run build
Start Command: npm start

Environment: Node
Node Version: 20.x
```

#### Environment Variables
```bash
# Required
NODE_ENV=production
PORT=10000  # Render uses port 10000

# Optional (for full features)
ANTHROPIC_API_KEY=sk-ant-api03-xxx  # For session summaries
NEXT_PUBLIC_WS_URL=wss://coder1-ide.onrender.com  # WebSocket URL

# Bridge Settings
BRIDGE_ENABLED=true
BRIDGE_TIMEOUT=300000  # 5 minutes
```

### 3. Deploy

1. Click "Create Web Service"
2. Wait for initial deploy (~5-10 minutes)
3. Access at: `https://coder1-ide.onrender.com`

## 📦 What Gets Deployed

### Core IDE
- Next.js application with React UI
- Monaco Editor (VSCode engine)
- Terminal with PTY support
- WebSocket server for real-time features

### Bridge System
- `/bridge` WebSocket namespace
- Pairing code generation
- Authentication endpoints
- Command routing

### API Endpoints
- `/api/bridge/pair` - Pairing validation
- `/api/bridge/status` - Connection status
- `/api/terminal-rest/*` - Terminal sessions
- `/api/sessions/*` - Session management

## 🔧 Post-Deployment Setup

### 1. Install Bridge CLI Script
Create `/public/install-bridge.sh`:
```bash
#!/bin/bash
echo "🚀 Installing Coder1 Bridge CLI..."
npm install -g coder1-bridge
echo "✅ Installation complete!"
echo "Run 'coder1-bridge start' to connect to the IDE"
```

### 2. Verify Deployment
```bash
# Check health
curl https://coder1-ide.onrender.com/api/health

# Test WebSocket
wscat -c wss://coder1-ide.onrender.com
```

### 3. Test Bridge Connection
```bash
# On local machine
coder1-bridge start --server https://coder1-ide.onrender.com

# In IDE
# Click "Connect Bridge" and enter pairing code
```

## 🚨 Troubleshooting

### WebSocket Issues
Render supports WebSockets. If connection fails:
1. Check NEXT_PUBLIC_WS_URL environment variable
2. Ensure using `wss://` protocol (not `ws://`)
3. Verify `/bridge` namespace is accessible

### Build Failures
```bash
# Common fixes
- Ensure all dependencies in package.json
- Check Node version (use 20.x)
- Verify build command includes npm install
```

### Bridge Connection Issues
```bash
# Debug commands
coder1-bridge status
coder1-bridge test --server https://coder1-ide.onrender.com
```

## 📊 Monitoring

### Render Dashboard
- View logs: Dashboard → Service → Logs
- Check metrics: Dashboard → Service → Metrics
- Monitor health: Dashboard → Service → Events

### Application Logs
```javascript
// Server logs show:
[BridgeManager] Generated pairing code XXXXXX
[BridgeManager] Bridge connected: bridge_xxxxx
[Terminal] Session created: session_xxxxx
```

## 🔄 Updating

```bash
# 1. Push updates to GitHub
git add .
git commit -m "fix: [description]"
git push origin refactor/clean-phase1

# 2. Render auto-deploys (if enabled)
# OR manually: Dashboard → Deploy → Deploy latest commit
```

## 🎯 Success Criteria

✅ IDE loads at https://coder1-ide.onrender.com
✅ Terminal creates sessions successfully
✅ Bridge CLI can connect with pairing code
✅ Claude commands route through bridge
✅ WebSocket connections stable

## 📝 Alpha Tester Instructions

Share this with alpha testers:

```markdown
## Quick Start for Alpha Testers

1. **Visit**: https://coder1-ide.onrender.com

2. **Install Bridge** (one command):
   ```
   curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash
   ```

3. **Connect**:
   - Click "Connect Bridge" in IDE
   - Run `coder1-bridge start`
   - Enter 6-digit code
   - Start using Claude!
```

## 🚀 Ready to Deploy!

1. Commit and push current changes
2. Create Render service with settings above
3. Share URL with alpha testers
4. Collect feedback and iterate!

---
*Deployment Guide v1.0*
*Last Updated: January 20, 2025*