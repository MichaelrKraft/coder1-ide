# 🚀 AI Team Deployment Guide

This guide provides complete instructions for deploying Coder1 IDE with AI Team functionality to Render.

## 📋 Prerequisites

Before deployment, ensure you have:

1. **GitHub repository** with the latest code pushed
2. **Render account** (free tier works for testing)
3. **Claude CLI** installed locally
4. **Claude Code subscription** (Pro or Team)

## 🎯 Quick Deploy (10 Minutes)

### Step 1: Prepare OAuth Token

```bash
# Install Claude CLI
npm install -g @anthropic-ai/claude-cli

# Authenticate
claude login

# Get your OAuth token
claude auth token
# Save this token! It starts with: sk-ant-oat01-...
```

### Step 2: Push Code to GitHub

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git add .
git commit -m "Deploy AI Team functionality to production"
git push origin master
```

### Step 3: Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `MichaelrKraft/coder1-ide`
4. Configure:
   - **Name**: `coder1-ide-production`
   - **Branch**: `master` (or your branch)
   - **Root Directory**: `coder1-ide-next`
   - **Runtime**: Node
   - **Build Command**: (leave default, uses render.yaml)
   - **Start Command**: (leave default, uses render.yaml)

### Step 4: Configure Environment Variables

In Render dashboard, add these environment variables:

#### 🔑 Required for AI Team

```env
# OAuth Token (from Step 1)
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-your-token-here

# Session Secrets (generate with: openssl rand -base64 32)
SESSION_SECRET=your-generated-session-secret
JWT_SECRET=your-generated-jwt-secret
BRIDGE_AUTH_SECRET=your-generated-bridge-secret

# Port Configuration
PORT=10000  # Render default
```

#### 📦 Complete Environment Variables

```env
# Core Configuration
NODE_ENV=production
PORT=10000
HOSTNAME=0.0.0.0

# Memory Management
NODE_OPTIONS=--max-old-space-size=400 --expose-gc
MEMORY_PANIC_THRESHOLD_MB=380

# URLs
NEXT_PUBLIC_API_URL=https://coder1-ide.onrender.com
NEXT_PUBLIC_UNIFIED_SERVER_URL=https://coder1-ide.onrender.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://coder1-ide.onrender.com
NEXT_PUBLIC_UNIFIED_SERVER=true

# Claude OAuth
CLAUDE_CODE_OAUTH_ENABLED=true
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-xxxxx  # YOUR TOKEN HERE

# AI Team Features
ENABLE_AI_TEAM=true
ENABLE_CLI_PUPPETEER=true
ENABLE_CLAUDE_BRIDGE=true
ENABLE_BRIDGE_SERVICE=true
NEXT_PUBLIC_ENABLE_AGENT_TABS=true

# Alpha Settings
ALPHA_MODE_ENABLED=true
ALPHA_INVITE_CODE=CODER1ALPHA2025
MAX_ALPHA_USERS=50

# Database
DATABASE_URL=sqlite:///data/coder1-sessions.db

# Security (generate these!)
SESSION_SECRET=change-this
JWT_SECRET=change-this
BRIDGE_AUTH_SECRET=change-this

# WebSocket
ENABLE_WS_AUTHENTICATION=true
WS_AUTH_TIMEOUT=30000
WS_HEARTBEAT_INTERVAL=30000

# Features
NEXT_PUBLIC_ENABLE_AI_CONSULTATION=true
NEXT_PUBLIC_ENABLE_AGENT_DASHBOARD=true
NEXT_PUBLIC_ENABLE_BRIDGE_DOWNLOAD=true
NEXT_PUBLIC_ENABLE_LOCAL_SYNC=true
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for build (~5-10 minutes)
3. Monitor logs for any errors
4. Once deployed, access: https://coder1-ide.onrender.com

## ✅ Verification Steps

### 1. Check Health Endpoint

```bash
curl https://coder1-ide.onrender.com/api/health
```

Expected response:
```json
{"status":"ok","timestamp":1234567890}
```

### 2. Test AI Team Functionality

1. Navigate to https://coder1-ide.onrender.com/ide
2. Click **"AI Team"** button in status bar
3. Look for success message (not fallback mode)
4. Verify agents spawn with actual names (not "Setup Assistant")

### 3. Monitor Logs

In Render dashboard:
1. Go to your service
2. Click **"Logs"** tab
3. Look for:
   - `✅ AI Team spawned with X automated agents`
   - No OAuth token errors
   - No timeout errors

## 🔍 Troubleshooting

### Issue: "Not Found" Error on Production

**Cause**: Deployment failed or incorrect routing
**Solution**:
1. Check Render build logs for errors
2. Verify `rootDir: coder1-ide-next` in render.yaml
3. Ensure branch is pushed to GitHub
4. Redeploy manually from Render dashboard

### Issue: AI Team Falls Back to Mock Mode

**Cause**: OAuth token not configured
**Solution**:
1. Verify token in Render environment variables
2. Check token format: `sk-ant-oat01-...`
3. Regenerate token: `claude auth token`
4. Update environment variable and redeploy

### Issue: Build Fails on Render

**Cause**: Memory limit exceeded or missing dependencies
**Solution**:
1. Check build command in render.yaml
2. Ensure `NODE_OPTIONS` is set properly
3. Try upgrading Render plan for more memory
4. Check for missing npm packages

### Issue: WebSocket Connection Fails

**Cause**: CORS or WebSocket configuration
**Solution**:
1. Verify WebSocket URL: `wss://coder1-ide.onrender.com`
2. Check CORS_ORIGINS environment variable
3. Ensure Render supports WebSocket (it does by default)

## 📊 Performance Optimization

### Memory Management

For Render Starter plan (512MB):
```env
NODE_OPTIONS=--max-old-space-size=400 --expose-gc
MEMORY_PANIC_THRESHOLD_MB=380
```

For Render Standard plan (2GB):
```env
NODE_OPTIONS=--max-old-space-size=1800 --expose-gc
MEMORY_PANIC_THRESHOLD_MB=1600
```

### Build Optimization

To speed up builds:
1. Use production dependencies only: `npm prune --production`
2. Clear caches: `rm -rf .next/cache`
3. Disable telemetry: `NEXT_TELEMETRY_DISABLED=1`

## 🔄 Updating Deployment

### To Deploy Changes:

```bash
# 1. Make changes locally
# 2. Test locally
npm run build
npm run start

# 3. Commit and push
git add .
git commit -m "Update: description of changes"
git push origin master

# 4. Render auto-deploys (if enabled)
# Or manually deploy from Render dashboard
```

### To Update Environment Variables:

1. Go to Render dashboard
2. Navigate to Environment tab
3. Update variables
4. Save (triggers automatic redeploy)

## 📈 Monitoring & Logs

### Key Metrics to Watch:

- **Memory Usage**: Should stay below 380MB
- **Response Time**: < 2 seconds for API calls
- **WebSocket Connections**: Monitor for drops
- **Error Rate**: < 1% for production

### Useful Log Queries:

```bash
# Check AI Team spawns
grep "AI Team spawned" logs.txt

# Check OAuth errors
grep "OAUTH" logs.txt

# Check memory issues
grep "heap" logs.txt
```

## 🎯 Success Criteria

Your deployment is successful when:

✅ Site loads at https://coder1-ide.onrender.com  
✅ IDE interface appears at /ide  
✅ AI Team button spawns real agents (not fallback)  
✅ Terminal shows agent activities  
✅ No OAuth token errors in logs  
✅ WebSocket connects successfully  
✅ Memory usage stays stable  

## 📚 Additional Resources

- [OAuth Setup Guide](./OAUTH_SETUP_GUIDE.md)
- [Render Documentation](https://render.com/docs)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Production Environment Variables](./.env.production)

## 🆘 Support

If you encounter issues:

1. Check Render status: https://status.render.com
2. Review logs in Render dashboard
3. Verify all environment variables are set
4. Open an issue: [GitHub Issues](https://github.com/michaelkraft/coder1-ide/issues)

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Status**: Production Ready 🚀