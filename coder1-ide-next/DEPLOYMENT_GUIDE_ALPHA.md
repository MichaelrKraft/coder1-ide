# Coder1 IDE Alpha Deployment Guide

## 🚀 Deployment to Render Starter Plan ($7/month)

This guide walks through deploying Coder1 IDE to Render's Starter plan with memory optimization for 5-10 alpha users.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Ensure code is pushed to GitHub
3. **Environment Variables**: Have your alpha invite code ready

## Step 1: Prepare for Deployment

### Test Locally with Production Constraints

```bash
# Test with memory limits
npm run dev:alpha

# Visit http://localhost:3001/ide?invite=CODER1ALPHA2025
# Check health: http://localhost:3001/api/health
```

### Build for Production

```bash
# Build with memory constraints
npm run build:alpha
```

## Step 2: Create Render Service

1. **Log into Render Dashboard**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**

## Step 3: Configure Service

### Basic Settings
- **Name**: `coder1-ide-alpha`
- **Region**: Oregon (or closest to your users)
- **Branch**: `master` or `main`
- **Runtime**: Node

### Build & Deploy Settings
- **Build Command**: 
  ```bash
  npm ci --production && NODE_OPTIONS="--max-old-space-size=400" npm run build
  ```
- **Start Command**:
  ```bash
  node --max-old-space-size=400 --expose-gc server.js
  ```

### Instance Type
- **Plan**: Starter ($7/month)
- **Memory**: 512MB
- **CPU**: 0.5

## Step 4: Environment Variables

Add these in Render dashboard under "Environment":

```env
# Core Settings
NODE_ENV=production
PORT=3001
DEPLOYMENT_MODE=alpha-limited

# Memory Optimization
NODE_OPTIONS=--max-old-space-size=400
MEMORY_OPTIMIZATION=aggressive

# Alpha Configuration
ALPHA_MODE_ENABLED=true
ALPHA_INVITE_CODE=YOUR_SECRET_CODE_HERE
MAX_ALPHA_USERS=10

# Claude CLI Settings
MAX_CONCURRENT_TEAMS=1
MAX_AGENTS_PER_TEAM=2
PROCESS_POOL_SIZE=1
PROCESS_TIMEOUT_MS=300000
IDLE_TIMEOUT_MS=60000

# Session Management
SESSION_QUEUE_ENABLED=true
MAX_QUEUE_SIZE=5
QUEUE_TIMEOUT_MS=120000
MEMORY_PANIC_THRESHOLD_MB=380

# Monitoring
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000
```

## Step 5: Add Disk Storage

1. In Render dashboard, go to "Disks" tab
2. Click "Add Disk"
3. Configure:
   - **Name**: `coder1-data`
   - **Mount Path**: `/data`
   - **Size**: 1GB

## Step 6: Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Watch the deploy logs
3. Wait for "Live" status (usually 3-5 minutes)

## Step 7: Verify Deployment

### Check Health Endpoint
```bash
curl https://coder1-ide-alpha.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "memory": {
    "used": 150,
    "limit": 400,
    "percentage": 38
  },
  "sessions": {
    "terminal": 0,
    "alpha": 0,
    "max": 10
  },
  "alpha": {
    "enabled": true,
    "slotsAvailable": 10
  }
}
```

### Test Alpha Access
```
https://coder1-ide-alpha.onrender.com/ide?invite=YOUR_SECRET_CODE_HERE
```

## 📊 Monitoring & Maintenance

### Memory Monitoring

The server automatically monitors memory and will:
- **Warning at 300MB**: Gentle cleanup, close idle sessions
- **Panic at 380MB**: Aggressive cleanup, kill processes
- **Critical at 400MB**: Request restart

### Health Checks

Render automatically pings `/api/health` every 30 seconds. If unhealthy for 10 minutes, it auto-restarts.

### View Logs

In Render dashboard:
1. Go to your service
2. Click "Logs" tab
3. Look for memory stats: `📊 Memory Stats:`

### Manual Restart

If needed, in Render dashboard:
1. Go to your service
2. Click "Manual Deploy" → "Restart service"

## 🎯 Alpha User Management

### Invite Users
Share this URL with alpha testers:
```
https://coder1-ide-alpha.onrender.com/ide?invite=YOUR_SECRET_CODE_HERE
```

### Monitor Usage
Check active sessions:
```bash
curl https://coder1-ide-alpha.onrender.com/api/health | jq '.sessions'
```

### Session Limits
- Max 10 concurrent users (configurable)
- Sessions auto-cleanup after 1 hour idle
- Memory pressure may queue new sessions

## 🚨 Troubleshooting

### High Memory Usage
1. Check health endpoint for current usage
2. Wait for automatic cleanup (every 30s)
3. If critical, service will auto-restart

### 503 Service Unavailable
- All alpha slots in use
- Wait for users to disconnect
- Or increase MAX_ALPHA_USERS (carefully!)

### Slow Performance
- Normal during memory cleanup
- Check logs for "Memory cleanup" messages
- Consider upgrading to Pro plan ($25/month) if persistent

## 📈 Scaling Beyond Alpha

When ready for more users:

### Option 1: Render Pro ($25/month)
- 2GB RAM
- 1 CPU
- Support 20-30 users
- Better performance

### Option 2: Multiple Instances
- Deploy multiple Starter instances
- Use load balancer
- Session affinity required

### Option 3: Move to Dedicated
- Railway, Fly.io, or DigitalOcean
- More control over resources
- Higher costs but better performance

## 🔒 Security Notes

1. **Keep invite code secret** - Don't commit to GitHub
2. **Rotate codes periodically** - Update in Render dashboard
3. **Monitor access logs** - Check who's using the service
4. **Use HTTPS only** - Render provides free SSL

## 📝 Deployment Checklist

- [ ] Local testing with `npm run dev:alpha`
- [ ] Build successful with `npm run build:alpha`
- [ ] GitHub repository connected to Render
- [ ] Environment variables configured
- [ ] Disk storage added
- [ ] Health check verified
- [ ] Alpha invite code tested
- [ ] Monitoring dashboard bookmarked
- [ ] Alpha users notified with access URL

## 🎉 Success Metrics

Your alpha deployment is successful when:
- Health endpoint shows "healthy" status
- Memory usage stays below 75%
- Users can access with invite code
- Sessions persist across refreshes
- No memory panic restarts in logs

## 📞 Support

- **Render Status**: [status.render.com](https://status.render.com)
- **Render Docs**: [docs.render.com](https://docs.render.com)
- **Memory Issues**: Check `/api/health` first
- **User Issues**: Verify invite code and slots available

---

*Last Updated: January 2025*
*Optimized for Render Starter Plan with 512MB RAM*