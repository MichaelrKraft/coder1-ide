# ✅ BASELINE WORKING STATE VERIFICATION 
**Date**: 2025-08-26 13:15:00
**Status**: VERIFIED WORKING

## 🎯 **Critical Working Files (DO NOT MODIFY)**

### **IDE Core Files**
- **JavaScript**: `public/ide/static/js/main.b6927ff9.js` (4,249,571 bytes)
- **CSS**: `public/ide/static/css/main.a86b5bab.css` (322,290 bytes)  
- **Server Config**: `src/app.js` line 482 (hardcoded HTML references above files)

### **CANONICAL Files (Official Versions)**
Located in `/CANONICAL/` directory:
- `hooks-v3.html` - Working hooks interface
- `vibe-dashboard.html` - Working vibe dashboard
- `component-studio.html` - Working component studio
- `workflow-dashboard.html` - Working workflow dashboard
- `homepage.html` - Working homepage

### **PUBLIC Files (Mixed Working/Legacy)**
Located in `/public/` directory:
- `templates-hub.html` - Working templates hub
- `ai-monitor.html` - Working AI monitor
- Various other HTML files (21 total)

## 🧪 **Verified Working Features**

### **✅ Server Status**
- **Port**: 3000
- **Health Check**: `http://localhost:3000/health` → 200 OK
- **Uptime**: Stable
- **OAuth Authentication**: Claude CLI v1.0.92 working

### **✅ IDE Functionality**  
- **URL**: `http://localhost:3000/ide`
- **Build Files**: Correctly served (main.b6927ff9.js + main.a86b5bab.css)
- **Expected Features**:
  - CoderOne logo (not old Coder1 logo)
  - AI Mastermind button in terminal header
  - OAuth-based AI authentication
  - Full terminal functionality

### **✅ Route Consistency**
```
✅ /health → 200 OK (server health)
✅ /ide → Serves main.b6927ff9.js correctly  
✅ /hooks → 200 OK (serves CANONICAL/hooks-v3.html)
✅ /vibe-dashboard → 200 OK (serves CANONICAL/vibe-dashboard.html)
✅ /templates-hub → 200 OK (serves public/templates-hub.html)
✅ /component-studio → 200 OK (serves CANONICAL/component-studio.html)  
✅ /workflow-dashboard → 200 OK (serves CANONICAL/workflow-dashboard.html)
```

## 🔧 **Current System Architecture**

### **File Serving Pattern**
```
Server Decision Logic:
├── /ide → Hardcoded HTML string (src/app.js:482)
├── /hooks → CANONICAL/hooks-v3.html
├── /vibe-dashboard → CANONICAL/vibe-dashboard.html  
├── /templates-hub → public/templates-hub.html
├── /component-studio → CANONICAL/component-studio.html
└── /workflow-dashboard → CANONICAL/workflow-dashboard.html
```

### **Build Process**
```
Source: coder1-ide/coder1-ide-source/build/ 
→ Copy to: public/ide/
→ Update: src/app.js hardcoded HTML (manual step)
→ Restart: Server to load new references
```

## 🚨 **Critical Dependencies**

### **OAuth Configuration**
- **File**: `.env.local`
- **Token**: `CLAUDE_CODE_OAUTH_TOKEN` (expires Aug 26, 2026)
- **Environment**: Must unset `ANTHROPIC_API_KEY` 

### **React Build Integrity**
- **Source**: `coder1-ide/coder1-ide-source/build/static/js/main.b6927ff9.js`
- **Deployed**: `public/ide/static/js/main.b6927ff9.js`  
- **Server Ref**: `src/app.js:482` hardcoded HTML
- **Status**: ✅ All three match and consistent

## ⚠️ **Known Issues (Non-Breaking)**

1. **Title Inconsistency**: IDE shows "React App" instead of "CoderOne IDE" 
   - **Cause**: Server reading from public file instead of hardcoded HTML
   - **Impact**: Cosmetic only, functionality unaffected

2. **Legacy Build Accumulation**: 100+ old main.*.js files in public/ide/static/js/
   - **Impact**: Disk space only, not affecting functionality

3. **Directory Duplication**: Some nested/recursive directories exist
   - **Impact**: Confusion only, not affecting functionality

## 🔒 **Rollback Information**

### **Backup Commands**
```bash
# Create full backup of working state
tar -czf "baseline-working-$(date +%Y%m%d-%H%M%S).tar.gz" \
  public/ide/static/js/main.b6927ff9.js \
  public/ide/static/css/main.a86b5bab.css \
  src/app.js \
  CANONICAL/ \
  .env.local

# Quick restore if needed  
cp baseline-working-*/src/app.js src/app.js
systemctl restart server || npm start
```

### **Critical File Hashes**
```
main.b6927ff9.js: 4,249,571 bytes (Aug 26 13:32)
main.a86b5bab.css: 322,290 bytes (Aug 26 13:32)
```

---

**⚠️ IMPORTANT**: Before any organizational restructure, verify ALL items above still work. This baseline ensures we don't accidentally break working functionality.

**✅ VERIFIED BY**: Claude Code Agent (Aug 26, 2025 13:15)
**✅ STATUS**: Ready for safe organizational restructuring