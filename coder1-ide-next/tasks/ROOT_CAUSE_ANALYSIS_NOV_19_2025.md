# Root Cause Analysis - AI Team Not Spawning (November 19, 2025)

## 🎯 Problem Statement

User typed detailed prompt in terminal, clicked AI Team button, but no agents spawned.
- Quality gate showed: `score: 0, passed: false`
- Reason: Terminal conversation history (terminalDataBuffers) was empty

## 🔍 Investigation Summary

### Hypotheses Tested

1. **❌ SessionId Mismatch**: Verified sessionIds match across entire flow
   - Frontend receives sessionId from `terminal:created` event
   - Same sessionId used for `terminal:input` events
   - Same sessionId passed to extract-requirement API
   - **Conclusion**: Not the issue

2. **❌ Socket Connection Issue**: Checked if input buffered locally due to disconnection
   - Terminal DOES have inputBufferRef for disconnected state (line 4061-4072)  
   - processInputBuffer() flushes when socket connects (line 2825-2843)
   - Called after `terminal:created` event (line 3777-3778)
   - **Conclusion**: Buffering mechanism exists and should work

3. **✅ ACTUAL ROOT CAUSE IDENTIFIED**: Multi-line paste handling issue

## 💡 Root Cause

### The Problem

When user pastes multi-line text (like the test prompt), the terminal processes it differently than typed input:

1. **Test prompt structure**:
   ```
   claude

   I need help building a React dashboard...
   [50+ lines of detailed requirements]
   ```

2. **Current behavior** (server.js line 1708):
   - ONLY buffers completed commands (when `\r` or `\n` detected)
   - Multi-line paste arrives as SINGLE `terminal:input` event with newlines embedded
   - Only the LAST line before final Enter gets assembled into commandBuffer
   - All the detailed requirement text in between is LOST

3. **Evidence from code**:
   ```javascript
   // server.js line 1680-1710
   socket.on('terminal:input', async ({ id, data, selected ClaudeModel }) => {
     // Builds commandBuffer character by character
     // Only buffers when Enter key detected: data.includes('\r')  
     // Multi-line pastes lose intermediate lines!
     bufferTerminalData(sessionId, 'terminal_input', commandLower);
   });
   ```

### Why Buffer Was Empty

1. User pastes 50-line detailed prompt
2. All text arrives in single or few `terminal:input` events
3. Server's commandBuffer logic only captures final "command" before Enter
4. The 49 lines of requirements NEVER get buffered
5. extract-requirement API finds empty/minimal buffer
6. Quality assessment: 0% (no substantial content)
7. AI Team spawn blocked

## 🛠️ Solution

### Option 1: Buffer All Terminal Input (Recommended)

Modify server.js `terminal:input` handler to buffer ALL input, not just completed commands:

```javascript
socket.on('terminal:input', async ({ id, data, selectedClaudeModel }) => {
  const sessionId = id || currentSessionId;
  const session = terminalSessions.get(sessionId);
  
  if (session) {
    // 🔧 NEW: Buffer ALL input immediately (not just on Enter)
    // Strip ANSI/bracketed paste markers
    const cleanData = data
      .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '') // ANSI codes
      .replace(/\[200~/g, '')                // Bracketed paste start
      .replace(/\[201~/g, '');               // Bracketed paste end
    
    if (cleanData.length > 0 && !cleanData.match(/^\x1b/)) {
      bufferTerminalData(sessionId, 'terminal_input', cleanData);
    }
    
    // Continue with existing commandBuffer logic...
    if (!commandBuffers.has(sessionId)) {
      commandBuffers.set(sessionId, '');
    }
    
    let buffer = commandBuffers.get(sessionId);
    
    // Existing Enter detection logic...
    if (data.includes('\r') || data.includes('\n')) {
      // Process completed command...
    }
  }
});
```

### Option 2: Capture PTY Output

Alternative: Buffer PTY echoed output (which includes full pasted text):

```javascript
// server.js line 1401-1449 (PTY onData handler)
session.pty.onData((data) => {
  // Existing code...
  
  // Buffer MORE aggressively (currently skips focus codes only)
  const hasFocusCodesOnly = data.includes('\x1b[I') || data.includes('\x1b[O');
  const hasControlChars = /[\x00-\x08\x0B-\x1F]/.test(data);
  
  if (!hasFocusCodesOnly && !hasControlChars) {
    bufferTerminalData(sessionId, 'terminal_output', data);
  }
});
```

## ✅ Recommended Fix

**Implement Option 1** because:
- Captures user's ACTUAL input, not echoed output
- Preserves original text before shell/Claude processing
- Type-discriminates input vs output for better extraction
- Minimal code changes (add ~5 lines to existing handler)

## 🧪 Testing

After implementing fix, test with:

1. Open IDE at http://localhost:3001/ide
2. Paste the detailed test prompt (50+ lines)
3. Wait for Claude to respond
4. Click AI Team button
5. **Expected**: Quality gate shows 70%+ score, agents spawn

## 📊 Success Criteria

- terminalDataBuffers contains pasted text
- extract-requirement finds high-confidence requirement
- Quality assessment: 70%+ score
- AI Team spawns successfully
- Agent terminals display output (previous socket fix working)

---

**Analysis Date**: November 19, 2025, 1:15 AM UTC
**Status**: Root cause identified, fix ready to implement
**Confidence**: 95% (high)
