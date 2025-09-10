# 🚀 Phase 2 Action Plan - Streamline & Optimize

**Date**: January 10, 2025  
**Agent**: Claude Sonnet 4  
**Duration**: Days 3-5  
**Focus**: Clean up, optimize, and prepare for real users  

---

## 📋 Phase 2 Priorities (Based on Week 2 Goals)

### Day 3: Code Cleanup & Performance
1. **Clean up legacy Express server** 
   - Archive `/src/` directory (it's broken and unused)
   - Remove references to port 3000 architecture
   - Clean up package.json scripts

2. **Fix memory issues**
   - Server showing 94% heap usage warnings
   - Implement proper garbage collection
   - Fix memory leaks in context system

3. **Fix auth session endpoint**
   - "Body already read" error preventing token generation
   - Required for full security testing

### Day 4: Documentation & Testing
1. **Update ALL documentation**
   - Remove references to dual-server architecture
   - Clarify CANONICAL vs actual working files
   - Update README with correct instructions

2. **Create automated tests**
   - Security test suite (expand existing)
   - Integration tests for core features
   - End-to-end user journey tests

3. **Performance optimization**
   - Reduce initial load time
   - Optimize bundle size
   - Fix 404 errors for static assets

### Day 5: Deployment & User Experience
1. **Simplify deployment**
   - Single command deployment
   - Environment variable validation
   - Health check endpoints

2. **User onboarding flow**
   - Landing page → IDE journey
   - First-time user experience
   - Alpha access code system

3. **Error tracking setup**
   - Add proper error boundaries
   - Implement logging system
   - Set up monitoring alerts

---

## 🎯 Immediate Actions (Day 3 - Today)

### 1. Archive Legacy Code
```bash
# Create archive directory
mkdir -p ARCHIVE/legacy-express-server
# Move deprecated code
mv src/* ARCHIVE/legacy-express-server/
# Update .gitignore
echo "ARCHIVE/" >> .gitignore
```

### 2. Fix Auth Endpoint
- Issue: Middleware reading body before handler
- Solution: Adjust middleware order or use different parsing

### 3. Memory Optimization
- Add proper cleanup in server.js
- Implement session timeout cleanup
- Add memory monitoring dashboard

### 4. Update Main Documentation
- Fix CLAUDE.md to reflect single server
- Update README with correct setup
- Remove conflicting architecture descriptions

---

## 💡 Quick Wins First

Since we're moving fast, let's prioritize quick wins that have immediate impact:

1. **Fix auth endpoint** (30 mins) - Unblocks full testing
2. **Archive legacy code** (15 mins) - Reduces confusion
3. **Update README** (30 mins) - Helps new users
4. **Add health endpoint** (15 mins) - Monitoring capability
5. **Fix static asset 404s** (1 hour) - Better UX

---

## 🧪 Testing Focus

### Core User Journey to Test
1. User visits landing page
2. Enters alpha access code
3. Creates first project
4. Types "claude" in terminal
5. AI assistance activates
6. Session persists across refresh
7. Session summary generates

### Security Tests to Add
- Token expiration handling
- Rate limit enforcement
- Session hijacking prevention
- Input sanitization verification

---

## 📊 Success Metrics for Phase 2

By end of Day 5, we should have:
- ✅ Zero memory warnings during normal operation
- ✅ Auth system fully functional
- ✅ All documentation accurate and consistent
- ✅ Automated test coverage >50%
- ✅ Single-command deployment working
- ✅ <3 second initial load time
- ✅ Zero 404 errors in console

---

## 🔧 Technical Decisions

### What to Keep
- Unified Next.js server (port 3001)
- Current security implementations
- Memory persistence system
- Terminal integration

### What to Remove
- All `/src/` Express code
- References to port 3000
- Dual-server documentation
- Unused dependencies

### What to Improve
- Memory management
- Error handling
- Loading performance
- Documentation clarity

---

## 🎬 Let's Begin!

Ready to start with the first task: **Fixing the auth endpoint** so we can properly test security features.

This is critical because:
1. Can't generate tokens for testing
2. Blocks full security validation
3. Prevents user onboarding flow

Shall we fix this first?