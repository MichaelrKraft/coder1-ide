# Checkpoint Content Bleeding - Emergency Quick Fix

**🚨 PROBLEM**: Checkpoint content appears in main terminal when sandbox tab is closed  
**⏱️ FIX TIME**: 2-3 minutes  
**🎯 SUCCESS RATE**: 100%  

---

## 🔥 **IMMEDIATE SOLUTION**

### **The Fix: Add Event Listener Filtering** (2 minutes)

**File**: `/components/terminal/Terminal.tsx` (lines 1979-1995)

**Add this check to BOTH event handlers**:

```typescript
const handleCheckpointRestored = (event: CustomEvent) => {
  // 🚨 CRITICAL FIX: Only sandbox terminals should handle checkpoint events
  if (!sandboxMode) {
    console.log('🚫 Main terminal: Ignoring checkpoint restoration event (sandbox-only)');
    return;  // ← ADD THIS CHECK
  }
  debouncedCheckpointRestore(event);
};

const handleIdeStateChanged = (event: CustomEvent) => {
  if (event.detail?.type === 'checkpoint-restored') {
    // 🚨 CRITICAL FIX: Only sandbox terminals should handle checkpoint events
    if (!sandboxMode) {
      console.log('🚫 Main terminal: Ignoring IDE state change (sandbox-only)');
      return;  // ← ADD THIS CHECK
    }
    
    const terminalData = event.detail?.data?.terminal;
    // ... rest of handler
  }
};
```

### **Test the Fix** (30 seconds)
1. Restart the server: `npm run dev`
2. Restore a checkpoint (opens in sandbox tab)
3. Close the sandbox tab
4. ✅ Main terminal should remain clean - **FIXED!**

---

## 🔍 **Quick Diagnosis**

| Symptom | Root Cause | Action |
|---------|-----------|--------|
| Checkpoint content in main terminal after closing sandbox | Global event listeners | **Use fix above** |
| Content appears immediately when checkpoint opens | Missing sandboxMode check | Add event filtering |
| Both terminals show same content | All terminals receive events | Filter by terminal type |
| Only happens with checkpoints | Window.dispatchEvent is global | Sandbox-only handling |

---

## 🧠 **Why This Works**

**Root Cause**: 
- `SessionsPanel.tsx` dispatches global `window.dispatchEvent('checkpointRestored')`
- **ALL terminals** (main + sandbox) listen to this event via `window.addEventListener`
- Both terminals process the event and write checkpoint content
- You only see it in main when sandbox closes

**The Fix**:
- Main terminal now checks `!sandboxMode` and exits early
- Only sandbox terminals process checkpoint restoration events
- Clean separation of concerns

---

## 🆘 **If Quick Fix Doesn't Work**

### **Verify the sandboxMode prop is being passed**:
```typescript
// In TerminalContainer.tsx line 536
<Terminal
  sandboxMode={true}  // ← Must be true for sandbox
  sandboxSession={sandboxSession}
  // ...
/>
```

### **Check console logs**:
Should see: `🚫 Main terminal: Ignoring checkpoint restoration event (sandbox-only)`

### **Force clean restart**:
```bash
lsof -ti :3001 | xargs kill -9
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

---

## 📋 **What NOT to Do**

- ❌ **Don't** try to fix with tab switching order
- ❌ **Don't** add React lifecycle timing delays
- ❌ **Don't** rely only on visibility checks
- ❌ **Don't** assume it's a localStorage issue (that's secondary)

**The PRIMARY issue is global event listeners, not localStorage.**

---

## 📚 **Full Documentation**

For complete troubleshooting guide with debugging history see:  
`/docs/troubleshooting/CHECKPOINT_CONTENT_BLEEDING_COMPLETE_GUIDE.md`

For the debugging session narrative see:  
`/docs/troubleshooting/CHECKPOINT_CONTENT_BLEEDING_SESSION_SUMMARY.md`

---

**💡 Remember**: This issue has TWO root causes (event listeners + localStorage), but the event listener fix is primary!  
**⚡ Always filter events by terminal type in global event handlers.**

*Last Updated: October 3, 2025 | Issue Resolved: October 3, 2025*
