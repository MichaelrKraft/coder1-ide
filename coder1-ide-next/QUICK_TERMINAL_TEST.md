# Quick Terminal Security Test (2 Minutes)

**Purpose**: Verify users cannot escape workspace directory via terminal

**Time Required**: 2 minutes

**Critical**: DO NOT SKIP THIS TEST BEFORE DEPLOYING TO RENDER

---

## Test Procedure

### Step 1: Open IDE in Browser
```bash
# Make sure server is running
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev

# Open in browser
open http://localhost:3001/ide
```

### Step 2: Open Terminal in IDE
1. Look for terminal panel in IDE
2. Click to activate terminal
3. Wait for terminal to initialize

### Step 3: Run Test Commands
```bash
# Test 1: Check current directory
pwd

# Expected: /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/user-workspaces/default
# OR: Some path ending in user-workspaces/default

# Test 2: Try to escape to parent directory
cd ..

# Test 3: Check where we are now
pwd

# Test 4: Try to list files
ls

# Test 5: Try to read source code
cat server.js
# OR
cat ../server.js
# OR
cat ../../coder1-ide-next/server.js
```

---

## Success Criteria

### ✅ PASS (Safe to Deploy)
- `pwd` shows workspace directory
- `cd ..` either:
  - Fails with "Permission denied"
  - Works but `ls` shows only workspace files
  - Takes you to a restricted directory
- Cannot read `server.js` or any source files
- No access to parent directory contents

### 🔴 FAIL (Do NOT Deploy)
- Can `cd ..` to parent directories freely
- Can see source files with `ls`:
  - server.js
  - package.json
  - app/
  - components/
  - etc.
- Can read source code with `cat server.js`

---

## If Test FAILS

### Quick Fix (20 minutes)
1. Edit `server.js` (search for PTY spawn)
2. Change working directory to workspace:
```javascript
// Find this line (around line 410-445):
cwd: finalWorkingDir

// Change to:
cwd: path.join(process.cwd(), 'user-workspaces/default')
```

3. Restart server
4. Re-run test
5. Verify fix works

### Alternative Fix (5 minutes - Less Secure)
Add to terminal initialization:
```javascript
// Trap cd command to prevent escape
export cd() {
  echo "Navigation restricted to workspace directory"
  return 1
}
```

---

## If Test PASSES

You're good to deploy! ✅

**Next Steps**:
1. Commit changes
2. Push to GitHub
3. Deploy to Render
4. Run post-deployment verification (see ALPHA_LAUNCH_VALIDATION_REPORT.md)

---

## Why This Test Matters

**The Risk**:
- File explorer is locked down to workspace ✅
- BUT terminal might allow directory navigation ⚠️
- Users could accidentally or intentionally access source code
- This would expose your intellectual property

**The Gap**:
- Previous agent only tested API endpoints with curl
- Terminal behavior was never verified in actual browser
- This is a **parallel attack vector** to file explorer

**2 Minutes Now > Hours of Incident Response Later**

---

**Created**: October 27, 2025  
**Part of**: Alpha Launch Validation  
**Priority**: CRITICAL - MUST TEST
