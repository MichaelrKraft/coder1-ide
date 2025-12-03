# 🔧 Bridge Connection Fix: "PQueue is not a constructor" (November 25, 2025)

## 🎯 For Alpha User (elik.k)

Hi! Thanks for testing Coder1! I found and fixed the "PQueue is not a constructor" error you encountered.

---

## 🔍 What Was the Problem?

**Error You Saw**:
```
TypeError: PQueue is not a constructor
    at new BridgeClient (/Users/elik.k/.nvm/versions/node/v22.3.0/lib/node_modules/coder1-bridge/src/bridge-client.js:32:25)
```

**Root Cause**: The bridge code had a mismatch between the p-queue package version and the import syntax:
- Package version: p-queue v5.0.0 (CommonJS)
- Import syntax: `require('p-queue').default` (ESM v6 pattern)
- Result: Trying to instantiate `undefined` as a constructor

**Why Node v22 Exposed This**: Node v22.x has stricter ESM/CommonJS separation, so this incompatibility broke immediately. Older Node versions were more lenient.

---

## ✅ The Fix (Already Applied!)

I've updated the bridge code to use the correct CommonJS import pattern:

**Before**:
```javascript
const PQueue = require('p-queue').default;  // ❌ Returns undefined with v5
```

**After**:
```javascript
const PQueue = require('p-queue');  // ✅ Works with v5
```

The fix is deployed to https://coder1.ai/bridge-cli.tar.gz and ready to install!

---

## 🚀 Quick Solution for You

```bash
# Uninstall old version
npm uninstall -g coder1-bridge
npm cache clean --force

# Install fixed version
npm install -g https://coder1.ai/bridge-cli.tar.gz

# Start bridge
coder1-bridge start
```

**What you should see**:
```
╔══════════════════════════════════════════════════════════╗
║                    CODER1 BRIDGE                        ║
╚══════════════════════════════════════════════════════════╝

✓ Connecting to: https://coder1.ai
✓ Claude CLI detected: 2.0.53 (Claude Code)
Enter the 6-digit pairing code from the IDE: [enter code]
⟳ Connecting to Coder1 IDE...
✓ Bridge connected successfully!
```

---

## 🎯 Expected Workflow

1. **Install bridge** (use commands above)
2. **Get pairing code**: Visit https://coder1.ai/ide and click "Bridge" button
3. **See 6-digit code** displayed on screen
4. **Enter code** in terminal when prompted
5. **Start coding!** Bridge is now connected

---

## ⚠️ Important Notes

### About the Error
- This was NOT a problem with your system
- Your Node v22.3.0 is actually PERFECT (latest stable)
- Your Claude CLI 2.0.53 is also correct
- The issue was in our bridge code (now fixed)

### System Requirements (All Met ✅)
From your screenshot:
- ✅ Node.js v22.3.0 (excellent!)
- ✅ Claude CLI 2.0.53 detected
- ✅ npm working correctly
- ✅ System is ready for the bridge

---

## 🔍 Technical Details (For Curiosity)

### The p-queue Version History

**p-queue v5.0.0** (what we use):
```javascript
// CommonJS export
module.exports = PQueue;

// Usage
const PQueue = require('p-queue');  // ✅ Direct import
```

**p-queue v6+** (incompatible with our setup):
```javascript
// Pure ESM export
export default PQueue;

// Usage in CommonJS
const PQueue = require('p-queue').default;  // .default needed for ESM
```

### Why the Mismatch Happened

Previous agents:
1. ✅ Updated package.json to use p-queue v5.0.0 (correct)
2. ❌ Forgot to update the import statement (still had .default)
3. Result: Code expected ESM pattern but got CommonJS module

### Why Node v22 is Stricter

Node v22+ enforces:
- Clear separation between ESM and CommonJS
- Stricter module resolution rules
- No silent fallbacks for mismatched imports

This is actually GOOD - it catches bugs like this earlier!

---

## 🆘 Troubleshooting

### If Installation Still Fails

**Verify clean slate**:
```bash
# Check if old version is gone
npm list -g coder1-bridge  # Should show "empty"

# Clear all npm caches
npm cache clean --force
npm cache verify
```

**Manual verification after install**:
```bash
# Check installed version
coder1-bridge --version  # Should show v1.0.0

# Check the import (if you're curious)
cat $(npm root -g)/coder1-bridge/src/bridge-client.js | grep "require('p-queue')"
# Should show: const PQueue = require('p-queue');  (no .default)
```

### If Bridge Connects But Commands Fail

**Test Claude CLI separately**:
```bash
claude --version  # Should show 2.0.53
echo "test" | claude "respond with: success"  # Should get Claude response
```

If Claude CLI isn't working:
- Visit https://claude.ai/download
- Re-download Claude CLI for macOS
- Restart terminal and try again

---

## 📊 Verification Checklist

After installing the fixed version:

- [ ] `npm uninstall -g coder1-bridge` completed
- [ ] `npm cache clean --force` completed
- [ ] `npm install -g https://coder1.ai/bridge-cli.tar.gz` succeeded
- [ ] `coder1-bridge start` shows the Coder1 banner
- [ ] No "PQueue is not a constructor" error
- [ ] Pairing code prompt appears
- [ ] Bridge connects successfully after entering code
- [ ] Can execute Claude commands through IDE

---

## 📧 Contact & Support

**If you encounter any other issues**:
- DM me directly (I'll respond quickly!)
- Include:
  - The command you ran
  - Full error output
  - Your Node.js version: `node -v`
  - Your Claude CLI version: `claude --version`

---

## 🎉 Thank You!

Your bug report with the detailed screenshot was incredibly helpful! Finding issues like this during alpha testing is exactly what makes the product better.

You're helping make Coder1 better for everyone! 🚀

---

## 📋 Related Fixes

This is the **second critical fix** deployed today (November 25, 2025):

1. **zmodload Error Fix**: Install script sourcing issue (earlier today)
2. **PQueue Constructor Fix**: Import syntax mismatch (THIS FIX)

Both issues are now resolved and deployed!

---

**Fix Applied**: November 25, 2025 15:44 PST  
**Issue**: TypeError: PQueue is not a constructor  
**Solution**: Corrected p-queue import to match v5.0.0 CommonJS pattern  
**Status**: ✅ FIXED - Ready for testing  
**Affected Users**: All users on Node v22.x  
**Deployment**: Live at https://coder1.ai/bridge-cli.tar.gz (497KB)
