# Discover Panel Link Troubleshooting Guide

## ⚠️ CRITICAL FOR ALL CLAUDE AGENTS

**Problem**: Discover panel AI Tools links intermittently break, showing "site can't be reached" or 404 errors.

**Root Cause**: Hardcoded port numbers in DiscoverPanel.tsx that don't match the actual unified server port.

---

## 🚨 Quick Fix (2-3 minutes)

### Step 1: Find the Correct Server Port
```bash
# Test which port serves static files correctly
curl -s -I http://localhost:3000/hooks-v3.html | head -1
curl -s -I http://localhost:3001/hooks-v3.html | head -1  
curl -s -I http://localhost:3002/hooks-v3.html | head -1

# Look for "HTTP/1.1 200 OK" response
```

### Step 2: Verify All Required Files
```bash
# The correct server should return 200 OK for all these files:
curl -s -I http://localhost:PORT/hooks-v3.html
curl -s -I http://localhost:PORT/templates-hub.html
curl -s -I http://localhost:PORT/components-capture.html
curl -s -I http://localhost:PORT/smart-prd-generator-standalone.html
curl -s -I http://localhost:PORT/workflow-dashboard.html
```

### Step 3: Update DiscoverPanel.tsx
Update the AI Tools section in `/components/status-bar/DiscoverPanel.tsx` (around lines 490-515):

```typescript
// Replace ALL port numbers with the correct port from Step 1
<a href="http://localhost:CORRECT_PORT/hooks-v3.html" target="_blank">AI Hooks</a>
<a href="http://localhost:CORRECT_PORT/templates-hub.html" target="_blank">AI Templates</a>
<a href="http://localhost:CORRECT_PORT/components-capture.html" target="_blank">AI Components</a>
<a href="http://localhost:CORRECT_PORT/smart-prd-generator-standalone.html" target="_blank">AI PRD</a>
<a href="http://localhost:CORRECT_PORT/workflow-dashboard.html" target="_blank">AI Workflows</a>
```

---

## 🔍 Common Scenarios & Solutions

### Scenario 1: "Site Can't Be Reached"
- **Cause**: Wrong port number in URLs
- **Solution**: Follow Quick Fix above

### Scenario 2: "404 Not Found" 
- **Cause**: Server doesn't have symlinks to CANONICAL files
- **Solution**: 
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/public
ln -sf ../../CANONICAL/hooks-v3.html hooks-v3.html
ln -sf ../../CANONICAL/templates-hub.html templates-hub.html
ln -sf ../../CANONICAL/components-capture.html components-capture.html
ln -sf ../../CANONICAL/workflow-dashboard.html workflow-dashboard.html
```

### Scenario 3: "Spinning Loading Circle"
- **Cause**: Server exists but returns invalid content
- **Solution**: Check server logs and restart unified server

---

## 🏗️ Understanding the Architecture

### Unified Server Design
- **Primary Server**: The unified Next.js server (typically port 3002)
- **Static Files**: Served from `/public/` directory via symlinks to `/CANONICAL/`
- **Symlinks**: Link CANONICAL files to Next.js public directory

### File Locations
```
/CANONICAL/                          # Source files
├── hooks-v3.html                   # 3D animated AI hooks interface
├── templates-hub.html              # 3D animated templates gallery  
├── components-capture.html         # Chrome extension page
├── smart-prd-generator-standalone.html  # PRD generator
└── workflow-dashboard.html         # AI workflows dashboard

/coder1-ide-next/public/            # Symlinks (served by Next.js)
├── hooks-v3.html -> ../../CANONICAL/hooks-v3.html
├── templates-hub.html -> ../../CANONICAL/templates-hub.html
├── components-capture.html -> ../../CANONICAL/components-capture.html
└── workflow-dashboard.html -> ../../CANONICAL/workflow-dashboard.html
```

### Port Assignment Logic
1. **Port 3002**: Unified Next.js server (preferred)
2. **Port 3001**: Alternative Next.js server  
3. **Port 3000**: Legacy Express server (may not serve static files)

---

## 🛠️ Automated Detection Script

Use the port detection utility:
```bash
# Run the detection script
node scripts/detect-server-ports.js

# Output will show correct URLs to use
```

---

## 📋 Verification Checklist

Before marking the issue as resolved:

- [ ] All 5 AI Tools links return 200 OK responses
- [ ] Links open in new tabs and show correct content
- [ ] No console errors when clicking links  
- [ ] Test from actual Discover panel (not just curl)
- [ ] Document which port is correct for next agent

---

## 🔄 Why This Keeps Happening

1. **Development Environment**: Multiple servers can start on different ports
2. **Server Restart Order**: Port assignment depends on what's already running
3. **Agent Handoffs**: Previous agents may not document current configuration
4. **Hardcoded URLs**: No dynamic port detection in the UI

---

## 📝 For Next Agent

**Current Working Configuration (as of last update):**
- **Unified Server Port**: 3001
- **All AI Tools URLs**: Use `http://localhost:3001/filename.html`
- **Symlinks Status**: ✅ Verified working
- **Last Tested**: September 18, 2025

**If links break again:**
1. Run port detection script first
2. Update this documentation with new port
3. Update DiscoverPanel.tsx
4. Test all 5 links manually

---

## 🆘 Emergency Recovery

If completely broken and you can't determine the correct port:

1. **Start fresh unified server**:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
# Note the port it starts on
```

2. **Verify symlinks exist**:
```bash
ls -la public/ | grep "\.html"
```

3. **Create missing symlinks if needed** (see Scenario 2 above)

4. **Update DiscoverPanel.tsx** with the correct port

5. **Test immediately** before finishing your session

---

*Last Updated: September 18, 2025*
*Next Agent: Please update the "Current Working Configuration" section above*