# Token Counter Debugging Guide

**Date**: November 22, 2025  
**Status**: Implementation complete, needs user testing

---

## 🔍 Quick Diagnosis

### Step 1: Check If Parser Test Page Works

Visit: `http://localhost:3001/test-token-parser.html`

**What to do**:
1. Click on any example pattern
2. Verify you see "✅ Token usage detected!"
3. If examples work, the parser logic is correct

**If examples DON'T work**: There's a JavaScript error - check browser console.

---

### Step 2: Test With Real Claude Code Output

**In your terminal** (while IDE is open):
1. Run any Claude Code command: `claude "what is 2+2?"`
2. Copy ALL the output from the terminal
3. Paste into test page at `http://localhost:3001/test-token-parser.html`
4. Check if parser detects tokens

**Expected Results**:
- ✅ **Parser finds tokens** → Problem is in the IDE integration
- ❌ **Parser doesn't find tokens** → We need to add the specific format Claude Code uses

---

### Step 3: Check Browser Console for Debug Logs

**Open browser DevTools** (F12 or Cmd+Opt+I):
1. Go to Console tab
2. Filter for "Token"
3. Look for: `📊 Token usage detected: {input: X, output: Y, total: Z}`

**What it means**:
- ✅ **You see the log** → Parser is working, store update might be failing
- ❌ **No log appears** → Parser isn't running or isn't finding tokens

---

### Step 4: Verify Store Function Works

**In browser console**, run:
```javascript
useIDEStore.getState().updateTokenUsage({ input: 100, output: 50, total: 150 })
```

Then check the token counter display.

**Expected**:
- ✅ **Counter updates to show 100 in, 50 out, 150 total** → Store works
- ❌ **Counter doesn't update** → Store or component issue

---

## 🔧 Common Issues & Fixes

### Issue 1: Parser Test Page Shows Errors

**Symptom**: Test page doesn't load or shows JavaScript errors

**Fix**:
```bash
# Restart dev server
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

---

### Issue 2: No Debug Logs in Console

**Symptom**: No "📊 Token usage detected" logs when Claude Code runs

**Possible causes**:
1. Terminal data isn't flowing through `terminalDataHandler`
2. Data chunks are too small (< 10 chars)
3. Claude Code isn't outputting token info

**Debug**:
Add this temporarily to Terminal.tsx (line ~3788):
```typescript
// Add BEFORE the token parsing block
console.log('🔍 Terminal data received:', data.substring(0, 100));
```

This will show you what data is actually being received.

---

### Issue 3: Parser Works on Test Page But Not in IDE

**Symptom**: Test page correctly parses tokens, but IDE counter doesn't update

**Possible causes**:
1. Token info comes in separate data chunks (split across multiple events)
2. Store update isn't triggering re-render
3. React component isn't subscribed correctly

**Fix**: We may need to buffer multiple lines before parsing.

---

### Issue 4: Counter Shows "2 in, 0 out, 2 total" Forever

**Symptom**: Counter never updates from initial values

**Possible causes**:
1. Parser isn't finding any tokens
2. Store update is failing silently
3. Component isn't re-rendering

**Debug steps**:
```javascript
// In browser console
const state = useIDEStore.getState()
console.log('Current token state:', state.aiState.tokenUsage)

// Try manual update
state.updateTokenUsage({ input: 1000, output: 500, total: 1500 })

// Check if it updated
console.log('After update:', state.aiState.tokenUsage)
```

---

## 📋 What You Need to Send Me

To debug further, I need this information:

### 1. Real Claude Code Output
Copy the **EXACT** text from your terminal when Claude Code runs. Include:
- The command you ran
- All output including any status lines
- Any token usage information that appears

### 2. Browser Console Logs
- Any errors (red text)
- Any "📊 Token usage detected" logs
- Any "🔍 Terminal data received" logs

### 3. Test Page Results
- Does test page work with examples? (Yes/No)
- Does test page work with your pasted terminal output? (Yes/No)
- If yes, what pattern did it match?

### 4. Store Test Results
What happened when you ran:
```javascript
useIDEStore.getState().updateTokenUsage({ input: 100, output: 50, total: 150 })
```

---

## 🎯 Implementation Summary

**Files Modified**:
1. `/lib/claude-token-parser.ts` - 6 pattern matchers
2. `/components/terminal/Terminal.tsx` - Added parsing on line ~3788
3. `/public/test-token-parser.html` - Test page created

**How it works**:
```
1. Terminal receives data from Claude Code
   ↓
2. terminalDataHandler called with data chunk
   ↓
3. parseClaudeTokenUsage(data) runs
   ↓
4. If tokens found → updateTokenUsage() called
   ↓
5. TerminalTokenStats re-renders with new values
```

**Key features**:
- ✅ Runs on ALL terminal output (not just Claude-detected output)
- ✅ 6 different pattern matchers for various formats
- ✅ Debug logging when tokens detected
- ✅ Session reset on new terminal

---

## 🧪 Next Steps for Testing

1. **Open IDE terminal**: `http://localhost:3001/ide`
2. **Open test page in another tab**: `http://localhost:3001/test-token-parser.html`
3. **Run Claude Code command** in IDE terminal
4. **Copy terminal output** to test page
5. **Send me the results** from all 4 debugging steps above

This will tell us exactly where the issue is.

---

## 🔍 Expected Claude Code Output Formats

Based on Claude Code CLI documentation, token info appears as:

**Format 1 (Most Common)**:
```
Context: 15,234 / 200,000 (7.6%)
```

**Format 2 (With Input/Output Breakdown)**:
```
Token usage: 12,123 input + 3,111 output = 15,234 total
```

**Format 3 (Budget Display)**:
```
<budget:token_budget>200000</budget:token_budget>
```

If your Claude Code output uses a DIFFERENT format, send it to me and I'll add a new pattern matcher.

---

**Last Updated**: November 22, 2025  
**Status**: Awaiting user testing feedback
