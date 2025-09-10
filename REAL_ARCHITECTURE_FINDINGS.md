# 🏗️ Coder1 IDE - REAL Architecture Documentation

**Date**: January 10, 2025  
**Status**: ✅ VERIFIED THROUGH TESTING  
**Author**: Claude Sonnet 4  

---

## 🎯 Executive Summary

After extensive testing with Playwright MCP and code analysis, I've discovered the **ACTUAL** architecture of the Coder1 IDE platform. The documentation conflicts arose from an evolutionary development process where multiple architectures were attempted and partially implemented.

---

## 🔍 What Actually Works (Verified via Playwright)

### ✅ **Current Working Architecture**

**Unified Next.js Custom Server** (`coder1-ide-next/server.js`)
- **Port**: 3001
- **Status**: WORKING (after fixing logger import)
- **Technology**: Next.js 14 with custom Express server
- **Features**:
  - Full IDE interface with Monaco editor
  - Integrated terminal with PTY support
  - WebSocket via Socket.IO
  - Preview panel for live code execution
  - Session management and memory system
  - Security-hardened file APIs with authentication

**Verified URLs**:
- `http://localhost:3001` - Homepage with memory demo
- `http://localhost:3001/ide` - Full IDE interface
- `http://localhost:3001/api/*` - Protected API endpoints

---

## 🚨 Architecture Confusion Explained

### Why Multiple Architectures Exist

1. **Legacy Express Server** (`src/app.js`)
   - **Port**: 3000
   - **Status**: BROKEN (missing agent definitions)
   - **Purpose**: Original server before Next.js migration
   - **Files**: Located in `/src/` directory
   - **Issue**: References deleted `.coder1/agents/` directory

2. **CANONICAL Static Files** (`/CANONICAL/`)
   - **Status**: Static HTML files only
   - **Purpose**: Template/reference implementations
   - **Not a server**: Just static files, needs HTTP server to view

3. **Public Directory** (`/public/`)
   - **Status**: Mixed static assets
   - **Purpose**: Serves static files for Next.js app
   - **Confusion**: Documentation mentions serving from here vs CANONICAL

---

## 📊 Actual vs Documented Architecture

| Component | Documentation Says | Reality | Status |
|-----------|-------------------|---------|---------|
| Main Server | Dual-server (3000 + 3001) | Unified Next.js (3001 only) | ✅ Working |
| Express Server | Active on port 3000 | Broken, not used | ❌ Defunct |
| Static Files | Serve from /public | Next.js handles routing | ✅ Working |
| CANONICAL | Primary working files | Reference templates only | ⚠️ Misleading |
| Terminal | Separate terminal server | Integrated in unified server | ✅ Working |
| Security | Various mentions | Fully implemented with auth | ✅ Fixed |

---

## 🔧 Key Issues Fixed During Investigation

### 1. Logger Import Issue
**Problem**: Enhanced tmux service importing `logger.js` instead of TypeScript file  
**Fix**: Changed import to `logger.ts` in `enhanced-tmux-service.ts`  
**Impact**: Server can now start successfully

### 2. Security Vulnerabilities (Previously Fixed)
**Problem**: Unauthenticated file system access  
**Fix**: Added authentication middleware to all file APIs  
**Status**: ✅ Verified working - APIs return "Authentication required"

### 3. Port Conflicts
**Problem**: Multiple attempts to use same ports  
**Solution**: Kill existing processes before starting

---

## 🏛️ The REAL Architecture (As of Jan 2025)

```
Coder1 IDE Platform (ACTUAL)
│
├── 🚀 Unified Next.js Server (Port 3001)
│   ├── Next.js Pages & Routing
│   ├── API Routes (/app/api/*)
│   ├── WebSocket Server (Socket.IO)
│   ├── Terminal PTY Sessions
│   └── Static Asset Serving
│
├── 💀 Legacy Express Server (DEFUNCT)
│   └── src/app.js (DO NOT USE)
│
├── 📁 Directory Structure
│   ├── /coder1-ide-next/ → Active IDE codebase
│   ├── /src/ → Legacy Express code (broken)
│   ├── /CANONICAL/ → Reference HTML templates
│   └── /public/ → Next.js static assets
│
└── 🔒 Security Layer
    ├── Bearer Token Authentication
    ├── Alpha Access Codes
    ├── Rate Limiting
    └── Path Traversal Protection
```

---

## 📝 For Future Agents

### Critical Information

1. **ALWAYS use the unified server** in `coder1-ide-next/`
2. **IGNORE the Express server** in `src/app.js` - it's broken
3. **Port 3001 is the ONLY port** you need
4. **CANONICAL files are NOT the working app** - they're just templates
5. **Security is already implemented** - don't remove authentication

### How to Start the IDE

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev

# Access at:
# http://localhost:3001 - Homepage
# http://localhost:3001/ide - IDE Interface
```

### Common Pitfalls to Avoid

- ❌ Don't try to fix the Express server - it's deprecated
- ❌ Don't look for separate terminal servers - it's integrated
- ❌ Don't remove authentication from file APIs
- ❌ Don't confuse CANONICAL with the actual working files

---

## 🎯 Bottom Line

**The Coder1 IDE runs on a single unified Next.js custom server on port 3001.**

Everything else is legacy code, reference templates, or outdated documentation. The platform is fully functional with:
- ✅ Working IDE interface
- ✅ Integrated terminal
- ✅ Secure file APIs
- ✅ Live preview functionality
- ✅ Memory and session management

The documentation conflicts arose from incomplete migration from the old Express architecture to the new Next.js architecture. The migration is complete, but the documentation wasn't updated consistently.

---

## 🚀 Next Steps

1. **Update all documentation** to reflect single unified server
2. **Remove or archive legacy code** in `/src/`
3. **Clarify CANONICAL directory purpose** in docs
4. **Standardize on port 3001** everywhere
5. **Remove references to dual-server architecture**

---

*Investigation completed with Playwright MCP browser testing*  
*All findings verified through actual runtime testing*