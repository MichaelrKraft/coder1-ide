# 🚨 PORT CONFIGURATION - CRITICAL REFERENCE FOR ALL AI AGENTS

**This document is the SINGLE SOURCE OF TRUTH for all port assignments in the Coder1 IDE system.**

## 🎯 Quick Reference

| Service | Port | URL | Status | Purpose |
|---------|------|-----|--------|---------|
| **Express Backend** | **3002** | `http://localhost:3002` | ✅ PRODUCTION | Main API server, WebSockets, terminal |
| **Next.js Frontend** | **3000** | `http://localhost:3000` | ✅ PRODUCTION | IDE interface, React components |

## 🚨 **CRITICAL RULES FOR AI AGENTS**

### ✅ DO THIS
- Always verify Express backend is running on port **3002**
- Ensure Next.js frontend connects to backend on port **3002**
- Check that `.env.local` uses port **3002** for backend URLs
- Start Express backend FIRST, then Next.js frontend

### ❌ NEVER DO THIS
- Point frontend to port 3000 for backend APIs (breaks menu items)
- Assume ports based on other projects or documentation
- Change ports without updating ALL configuration files
- Start Next.js before Express backend is running

## 🔧 Startup Commands

### Correct Startup Sequence
```bash
# Terminal 1: Start Express Backend FIRST
cd /Users/michaelkraft/autonomous_vibe_interface
npm run dev
# ✅ Express starts on port 3002

# Terminal 2: Start Next.js Frontend SECOND  
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
# ✅ Next.js starts on port 3000
```

### Verification Commands
```bash
# Check if Express backend is running
curl http://localhost:3002/health

# Check if Next.js frontend is running  
curl http://localhost:3000

# List all processes on development ports
lsof -i :3000,3001,3002
```

## 📋 Configuration File Locations

### Primary Configuration Files
```
/Users/michaelkraft/autonomous_vibe_interface/
├── .env                              # PORT=3002 (Express backend)
├── src/app.js                        # server.listen(PORT, ...) 
└── coder1-ide-next/
    ├── .env.local                    # EXPRESS_BACKEND_URL=http://localhost:3002
    └── lib/api-config.ts             # getBackendUrl() function
```

### Configuration Requirements
```bash
# Main project .env
PORT=3002

# Next.js .env.local  
EXPRESS_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_EXPRESS_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3002
```

## 🔍 Port Validation Checklist

Before making any changes, verify:

- [ ] Express backend configured for port 3002 in `.env`
- [ ] Next.js `.env.local` points to port 3002 for backend 
- [ ] `api-config.ts` uses correct `getBackendUrl()` implementation
- [ ] WebSocket connections target port 3002
- [ ] No hardcoded port 3000 references in API calls

## 🚨 Common Problems & Solutions

### "StatusBar Buttons Don't Work"
**Root Cause**: Frontend calling port 3000 instead of 3002 for APIs

**Solution**: 
1. Check `coder1-ide-next/.env.local` 
2. Ensure all backend URLs use port 3002
3. Restart Next.js development server

### "Terminal Shows Disconnected" 
**Root Cause**: WebSocket trying to connect to wrong port

**Solution**:
1. Verify Express backend running on port 3002
2. Check `NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3002`
3. Restart both servers in correct order

### "Menu Items Break After Port Changes"
**Root Cause**: Configuration files not synchronized

**Solution**:
1. Run port validation script: `npm run validate:ports`
2. Update all configuration files consistently  
3. Clear Next.js cache: `rm -rf .next`
4. Restart both servers

## 🛠️ Port Management Scripts

### Available Commands
```bash
# Clean and start development environment
npm run dev:clean

# Kill processes on specific ports
npm run kill-ports 3000 3001 3002

# Validate port configuration
npm run validate:ports

# Find available ports
./scripts/find-free-port.sh 3000
```

## 📊 Historical Context

### Why Port 3002?
- **Express Backend**: Configured in `.env` as `PORT=3002`
- **Separation of Concerns**: Different ports for frontend (3000) and backend (3002)
- **Development Workflow**: Allows both servers to run simultaneously
- **Production Ready**: Easy to separate frontend/backend deployments

### Previous Issues
- **Port Drift**: Services started on different ports during development
- **Configuration Mismatch**: Frontend calling wrong backend port
- **Menu Item Failures**: API calls failing due to port confusion
- **Agent Confusion**: Multiple agents working with different assumptions

## 🔮 Future Considerations

### Planned Improvements
1. **Automated Validation**: Pre-commit hooks to verify port consistency
2. **Dynamic Port Discovery**: Auto-detect and adjust port configurations
3. **Environment Detection**: Different ports for dev/staging/production
4. **Docker Integration**: Container-based port management

### Migration Notes
- All legacy references to other ports should be updated to match this configuration
- Any new features must follow these port assignments
- Documentation should reference this file as the authoritative source

---

## 🚀 Quick Start for New AI Agents

1. **Read this document first** before making any IDE changes
2. **Verify current configuration** matches the specifications above  
3. **Test both servers** using the startup sequence
4. **Run validation** if you encounter any issues
5. **Update documentation** if you discover any discrepancies

**Remember**: This configuration prevents the #1 cause of "menu items don't work" issues!

---

*Created: September 2, 2025*  
*Last Updated: September 2, 2025*  
*Authority: Single source of truth for Coder1 IDE port configuration*  
*Maintainers: All Claude Code AI agents working on this project*