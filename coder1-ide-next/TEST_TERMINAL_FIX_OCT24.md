# Quick Terminal Fix Test Script (October 24, 2025)

## ⚡ 5-Minute Acceptance Test

Run these commands in browser console at `http://localhost:3001/ide`

### Test 1: Clean Start (2 minutes)
```javascript
// Step 1: Clear everything
localStorage.clear();
location.reload();

// Step 2: Wait for terminal to load, then type: ls

// Step 3: Check what was saved
console.log('✅ Test 1 - Checking saved data:');
const saved = localStorage.getItem('mainTerminalHistory');
console.log('  Length:', saved?.length || 0);
console.log('  Has ANSI codes:', saved?.includes('\x1b') || false);
console.log('  Has focus codes:', saved?.includes('[I') || saved?.includes('[O') || false);

// ✅ PASS IF: Length > 0, Has ANSI = false, Has focus codes = false
```

### Test 2: Refresh Stability (2 minutes)
```javascript
// Step 1: Refresh page
location.reload();

// Step 2: Can you type? Try: pwd

// Step 3: Refresh again
location.reload();

// Step 4: Can you still type? Try: echo "test"

// Step 5: Check for corruption
const data = localStorage.getItem('mainTerminalHistory');
const ansiCount = (data?.match(/\x1b\[[0-9;]*[a-zA-Z]/g) || []).length;
console.log('✅ Test 2 - Corruption check:');
console.log('  ANSI escape count:', ansiCount);
console.log('  Status:', ansiCount > 50 ? '❌ CORRUPTED' : '✅ CLEAN');

// ✅ PASS IF: Can type after both refreshes, ANSI count < 50
```

### Test 3: Corruption Detection (1 minute)
```javascript
// Step 1: Inject fake corruption
localStorage.setItem('mainTerminalHistory', '\x1b[I\x1b[O'.repeat(100));

// Step 2: Reload
location.reload();

// Step 3: Check console for warning
// ✅ SHOULD SEE: "⚠️ CORRUPTED TERMINAL HISTORY DETECTED"

// Step 4: Can you type normally?
// ✅ PASS IF: Terminal starts fresh, no corrupted display, can type
```

## 🔍 Server Log Verification

While typing in terminal, server logs should show:

```
🔍 [ANSI-CHECK] data="[I" (2 bytes) isAnsi=true
🔧 [FILTER] Blocked ANSI escape code from command buffer: "[I"
```

**If you DON'T see these logs**: ANSI filter isn't executing properly.

## ✅ All Tests Passed?

If all 3 tests pass:
- ✅ Terminal is FIXED and ready for alpha launch
- ✅ No more progressive corruption
- ✅ Corruption auto-detected and cleared

## ❌ If Tests Fail

### Server not restarted?
```bash
lsof -ti :3001 | xargs kill -9
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

### Browser cache?
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Or: DevTools → Network tab → "Disable cache"

### Still broken?
Check `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/TERMINAL_FIX_COMPLETE_OCT24.md` for detailed debugging.

---

**Total Test Time**: 5 minutes  
**Expected Result**: All tests pass ✅  
**Next Step**: Alpha launch 🚀
