# 🚀 Render Deployment Guide for Coder1 IDE

## Quick Deploy Steps

### 1. Create Render Account
Visit https://render.com and sign up (free tier available)

### 2. Connect GitHub Repository
1. Click "New +" → "Web Service"
2. Connect your GitHub account
3. Select `MichaelrKraft/coder1-ide` repository
4. Choose branch: `master`

### 3. Configure Service

**Basic Settings:**
- **Name**: `coder1-ide`
- **Region**: Oregon (US West)
- **Branch**: master
- **Root Directory**: `coder1-ide-next`
- **Runtime**: Node

**Build Command:**
```bash
npm install && npm run build && npm rebuild node-pty --update-binary
```

**Start Command:**
```bash
npm run start
```

### 4. Environment Variables

Click "Environment" tab and add:

```env
# Required
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://coder1-ide.onrender.com
NEXT_PUBLIC_API_URL=https://coder1-ide.onrender.com

# Bridge Configuration
ENABLE_BRIDGE=true
BRIDGE_SERVER_URL=https://coder1-ide.onrender.com
BRIDGE_PAIRING_TIMEOUT=300000

# Optional (for AI features)
ANTHROPIC_API_KEY=your-api-key-here  # For Error Doctor & Session Summary

# Terminal Settings
TERMINAL_COLS=80
TERMINAL_ROWS=24

# Session Management
SESSION_TIMEOUT=3600000
MAX_SESSIONS=100

# Feature Flags
ENABLE_SESSION_SUMMARY=true
ENABLE_ERROR_DOCTOR=true
ENABLE_AI_SUPERVISION=true
```

### 5. Deploy

1. Click "Create Web Service"
2. Wait for build and deploy (5-10 minutes)
3. Visit your URL: `https://coder1-ide.onrender.com`

## Testing the Deployment

### 1. Health Check
```bash
curl https://coder1-ide.onrender.com/api/health
```

### 2. Access IDE
- Main IDE: https://coder1-ide.onrender.com/ide
- Dashboard: https://coder1-ide.onrender.com

### 3. Test Bridge Connection
```bash
# Install bridge locally
curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash

# Connect to production
coder1-bridge start
```

## Troubleshooting

### Build Fails
- Check Node version (needs 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### Terminal Not Working
- node-pty requires rebuild on Render
- Ensure `npm rebuild node-pty --update-binary` is in build command

### Bridge Connection Issues
- Verify WebSocket support (Render supports this)
- Check CORS settings
- Ensure JWT_SECRET is set

### Memory Issues
- Free tier has 512MB limit
- Monitor usage in Render dashboard
- Consider upgrading if needed

## Production Checklist

✅ GitHub repository connected  
✅ Environment variables set  
✅ Build command includes node-pty rebuild  
✅ Health endpoint working  
✅ WebSocket connections enabled  
✅ Bridge CLI downloadable  
✅ IDE accessible via HTTPS  

## Cost Estimates

**Free Tier (750 hours/month):**
- Perfect for alpha testing
- Sleeps after 15 minutes inactivity
- 512MB RAM, shared CPU

**Starter Plan ($7/month):**
- Always on (no sleep)
- 512MB RAM, dedicated CPU
- Better for production

**Standard Plan ($25/month):**
- 2GB RAM
- Supports 100+ concurrent users
- Recommended for scaling

## Support

- Render Status: https://status.render.com
- Render Docs: https://render.com/docs
- Coder1 Issues: https://github.com/MichaelrKraft/coder1-ide/issues

## Next Steps After Deployment

1. **Test Bridge Connection**: Ensure CLI bridge works with production
2. **Monitor Logs**: Check Render dashboard for errors
3. **Set Up Custom Domain**: Optional, via Render settings
4. **Enable Auto-Deploy**: Automatic deploys on git push
5. **Configure Alerts**: Set up monitoring for downtime

---

**Deployment Time**: ~10 minutes  
**Alpha Ready**: Yes ✅  
**Bridge Support**: Full ✅  
**Cost**: Free for alpha testing