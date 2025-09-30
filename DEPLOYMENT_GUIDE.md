# 🚀 Coder1 IDE - Deployment Guide

## 📋 Overview

This guide walks you through deploying Coder1 IDE to Render.com, a modern cloud platform that provides seamless deployment for Node.js applications with WebSocket support.

## ✅ Prerequisites

- [x] GitHub account with repository access
- [x] Render.com account (free tier available)
- [x] Repository: https://github.com/MichaelrKraft/coder1-ide

## 🎯 Quick Deploy to Render

### Option 1: One-Click Deploy (Recommended)

1. **Click Deploy Button**: Visit the repository and click "Deploy to Render"
2. **Connect GitHub**: Authorize Render to access your GitHub account
3. **Configure Environment**: Set required environment variables (see below)
4. **Deploy**: Click "Create Web Service"

### Option 2: Manual Deploy

1. **Log into Render**: Visit [render.com](https://render.com) and log in
2. **New Web Service**: Click "New +" → "Web Service"
3. **Connect Repository**: Select "Connect GitHub" and choose `MichaelrKraft/coder1-ide`
4. **Configure Service**:
   - **Name**: `coder1-ide` (or your preferred name)
   - **Branch**: `master`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build:render`
   - **Start Command**: `npm start`
   - **Plan**: `Starter` (can upgrade to `Standard` for more resources)

## 🔐 Required Environment Variables

### Essential Variables (Required for Basic Functionality)

Add these in Render Dashboard → Environment Variables:

```bash
# Security (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-secure-random-jwt-secret-256-bits
JWT_REFRESH_SECRET=your-secure-random-refresh-secret-256-bits

# Server Configuration (Render auto-sets PORT)
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=1500

# Public URLs (Auto-populated by Render)
NEXT_PUBLIC_API_URL=https://your-app-name.onrender.com
NEXT_PUBLIC_UNIFIED_SERVER_URL=https://your-app-name.onrender.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-app-name.onrender.com
```

### Optional Variables (Enhanced Features)

```bash
# AI Services (for enhanced AI features)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Google OAuth (for user authentication)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Services (for notifications)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
# OR
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
```

## 🏗️ Architecture on Render

```
Render Infrastructure:
┌─────────────────────────────────────────┐
│         Render Web Service              │
│  ┌─────────────────────────────────────┐ │
│  │     Next.js Custom Server          │ │
│  │     (Port auto-assigned)           │ │
│  │                                   │ │
│  │  ✅ Next.js UI & API Routes       │ │
│  │  ✅ Terminal PTY Support          │ │
│  │  ✅ WebSocket via Socket.IO       │ │
│  │  ✅ File Operations               │ │
│  │  ✅ AI Integration                │ │
│  │  ✅ Session Management            │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  📦 Persistent Disk: /app/data (1GB)   │
│  🔒 Environment Variables (encrypted)   │
│  🌐 Auto HTTPS & Custom Domains        │
└─────────────────────────────────────────┘
```

## 🔧 Deployment Process Details

### Build Process
1. **Dependencies**: `npm install` (with postinstall script)
2. **Node-PTY Rebuild**: `npm rebuild node-pty --update-binary` (for Linux)
3. **Next.js Build**: `next build` (optimized production build)
4. **Startup**: `node server.js` (unified custom server)

### Health Checks
- **Endpoint**: `/` (homepage)
- **Frequency**: Every 30 seconds
- **Timeout**: 10 seconds
- **Failure Threshold**: 3 consecutive failures

### Resource Limits
- **Starter Plan**: 512MB RAM, 0.1 CPU
- **Standard Plan**: 2GB RAM, 1 CPU (recommended for AI features)
- **Disk**: 1GB persistent storage for data/sessions

## 🚀 Post-Deployment Setup

### 1. Verify Deployment
- Visit your Render URL: `https://your-app-name.onrender.com`
- Check IDE interface: `https://your-app-name.onrender.com/ide`
- Test terminal functionality

### 2. Configure DNS (Optional)
```bash
# Custom Domain Setup in Render Dashboard
1. Go to Settings → Custom Domains
2. Add your domain: ide.yourdomain.com
3. Update DNS records as instructed
4. Enable automatic HTTPS
```

### 3. Set Up Monitoring
```bash
# Available in Render Dashboard
- Service Logs (real-time)
- Metrics (CPU, Memory, Network)
- Deploy History
- Environment Variables
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check logs for:
- Node.js version compatibility (requires 14+)
- node-pty build issues
- Missing dependencies

# Solutions:
- Ensure package.json includes all dependencies
- Check Node.js version in render.yaml
- Verify build command: npm run build:render
```

#### 2. Terminal Not Working
```bash
# Symptoms:
- Terminal shows "Connection lost"
- WebSocket connection errors

# Solutions:
- Verify WebSocket URL uses wss:// (not ws://)
- Check port configuration (Render auto-assigns)
- Ensure node-pty rebuilt for Linux
```

#### 3. Memory Errors
```bash
# Symptoms:
- Application crashes
- "Out of memory" errors

# Solutions:
- Upgrade to Standard plan (2GB RAM)
- Verify NODE_OPTIONS=--max-old-space-size=1500
- Monitor memory usage in dashboard
```

#### 4. Environment Variable Issues
```bash
# Symptoms:
- Features not working
- Authentication errors

# Solutions:
- Check all required variables are set
- Verify JWT secrets are 256-bit random strings
- Ensure URLs use https:// and wss://
```

### Getting Help

1. **Render Logs**: Dashboard → Logs (real-time debugging)
2. **GitHub Issues**: Report problems at repository issues
3. **Render Support**: Available in Render dashboard
4. **Documentation**: This guide and README.md

## 🎯 Production Optimizations

### Performance
- **CDN**: Render provides global CDN automatically
- **Caching**: Static assets cached at edge locations
- **Compression**: Gzip/Brotli enabled by default
- **HTTP/2**: Automatic HTTP/2 support

### Security
- **HTTPS**: Automatic SSL/TLS certificates
- **DDoS Protection**: Built-in protection
- **Environment Variables**: Encrypted at rest
- **Private Networking**: Internal service communication

### Scaling
- **Auto-scaling**: Available on higher plans
- **Load Balancing**: Built-in load balancing
- **Zero-downtime Deploys**: Rolling deployments
- **Health Checks**: Automatic service monitoring

## 🎉 Success Checklist

After deployment, verify these features work:

- [ ] **Homepage loads**: Main landing page accessible
- [ ] **IDE Interface**: Full IDE at `/ide` endpoint
- [ ] **Terminal**: Interactive terminal with commands
- [ ] **File Operations**: Create, edit, save files
- [ ] **WebSocket**: Real-time terminal communication
- [ ] **AI Features**: If API keys configured
- [ ] **Session Management**: Session persistence
- [ ] **Authentication**: If OAuth configured

## 📊 Monitoring & Maintenance

### Regular Tasks
- **Monitor Logs**: Check for errors or warnings
- **Update Dependencies**: Keep packages up to date
- **Review Metrics**: CPU, memory, and network usage
- **Test Features**: Periodic functionality testing

### Automatic Features
- **Health Checks**: Automatic service monitoring
- **Auto-deploy**: Deploys on GitHub pushes
- **Backup**: Render handles infrastructure backups
- **SSL Renewal**: Automatic certificate renewal

---

## 🎯 Next Steps

1. **Custom Domain**: Set up your own domain
2. **Monitoring**: Configure alerting for issues
3. **Scaling**: Upgrade plan as usage grows
4. **Features**: Enable AI and OAuth features
5. **Integration**: Connect with external services

Your Coder1 IDE is now running in production! 🎉

**Deployment URL**: `https://your-app-name.onrender.com`
**IDE Interface**: `https://your-app-name.onrender.com/ide`

---

*Last Updated: September 30, 2025*
*For support, visit: https://github.com/MichaelrKraft/coder1-ide/issues*