# Checkpoint Terminal Isolation Fix

## Summary

**Date**: October 3, 2025  
**Issue**: Checkpoint sandbox terminal content appearing in main terminal when sandbox tab closed  
**Root Causes**: 
1. **PRIMARY**: Global window event listeners - both terminals receive `checkpointRestored` events
2. **SECONDARY**: localStorage race condition with global `terminalHistory` key
**Solution**: Event listener filtering + terminal-type-specific localStorage keys (defense in depth)

## The Problem

### Symptoms
When restoring a checkpoint and then closing the sandbox tab:
1. Checkpoint opens correctly in sandbox terminal
2. User closes sandbox tab → main terminal becomes active
3. **BUG**: Checkpoint content suddenly appears in main terminal
4. Main terminal polluted with sandbox history

### Root Cause Discovery

**PRIMARY ISSUE: Global Window Event Listeners**:
- `Terminal.tsx` lines 2049-2051: **ALL terminals** listen to `checkpointRestored` window event
- `SessionsPanel.tsx` dispatches global `window.dispatchEvent('checkpointRestored')`
- **BOTH main AND sandbox terminals receive and process the event**

**The Actual Bug Flow**:
```
1. User opens checkpoint
2. SessionsPanel dispatches 'checkpointRestored' window event
3. Sandbox terminal receives event → writes checkpoint content (✅ correct)
4. Main terminal ALSO receives event → writes checkpoint content (🚨 BUG!)
5. User sees sandbox tab (active), main terminal hidden
6. User closes sandbox tab → main terminal becomes visible
7. 🚨 Main terminal displays checkpoint content from step 4!
```

**SECONDARY ISSUE: Global localStorage Pollution** (also fixed):
- `SessionsPanel.tsx` line 259: `localStorage.setItem('terminalHistory', snapshot.terminal)`
- `Terminal.tsx` line 1350: `localStorage.getItem('terminalHistory')`
- Shared global key could cause issues during re-initialization

### Failed Attempts

**Attempt 1**: Clear sandbox before switching tabs
- **Result**: Failed - timing issue with React component lifecycle

**Attempt 2**: Switch tabs first, then clear sandbox with `requestAnimationFrame`
- **Result**: Failed - main terminal still re-initialized and read localStorage

**Attempt 3**: Add `isVisible` check to prevent writing when hidden
- **Result**: Failed - didn't prevent localStorage reading

**Attempt 4**: Implement localStorage key isolation
- **Result**: Failed - content still appearing (but was part of final solution)

**The Real Issue**: All attempts fixed SECONDARY issues (localStorage, tab switching) but missed the PRIMARY cause: **Global window event listeners**. The main terminal was receiving and processing `checkpointRestored` events meant only for sandbox terminals.

## The Solution

### Two-Part Architectural Fix

#### Part 1: Event Listener Filtering (Primary Fix)
Add `sandboxMode` check to window event handlers so main terminal ignores checkpoint events.

#### Part 2: localStorage Key Isolation (Defense in Depth)
Use different localStorage keys for different terminal types:
- **Sandbox terminals**: `sandboxTerminalHistory_${checkpointId}`
- **Main terminal**: `mainTerminalHistory`

### Implementation

#### 1. Terminal.tsx (Event Listener Filtering - PRIMARY FIX)

**Location**: `/components/terminal/Terminal.tsx` lines 1979-1995

**Before**:
```typescript
const handleCheckpointRestored = (event: CustomEvent) => {
  debouncedCheckpointRestore(event);
};

const handleIdeStateChanged = (event: CustomEvent) => {
  if (event.detail?.type === 'checkpoint-restored') {
    // Process checkpoint restoration
    const terminalData = event.detail?.data?.terminal;
```

**After**:
```typescript
const handleCheckpointRestored = (event: CustomEvent) => {
  // 🚨 CRITICAL FIX: Only sandbox terminals should handle checkpoint restoration events
  // Main terminal should ignore these events to prevent content duplication
  if (!sandboxMode) {
    console.log('🚫 Main terminal: Ignoring checkpoint restoration event (sandbox-only)');
    return;
  }
  debouncedCheckpointRestore(event);
};

const handleIdeStateChanged = (event: CustomEvent) => {
  if (event.detail?.type === 'checkpoint-restored') {
    // 🚨 CRITICAL FIX: Only sandbox terminals should handle checkpoint IDE state changes
    if (!sandboxMode) {
      console.log('🚫 Main terminal: Ignoring IDE state change (sandbox-only)');
      return;
    }
    
    // Process checkpoint restoration
    const terminalData = event.detail?.data?.terminal;
```

#### 2. SessionsPanel.tsx (localStorage Isolation - DEFENSE IN DEPTH)

**Location**: `/components/SessionsPanel.tsx` line 260-264

**Before**:
```typescript
localStorage.setItem('terminalHistory', snapshot.terminal);
```

**After**:
```typescript
// 🚨 CRITICAL FIX: Use checkpoint-specific key to prevent localStorage pollution
// This prevents sandbox terminal content from appearing in main terminal
const storageKey = `sandboxTerminalHistory_${checkpoint.id}`;
localStorage.setItem(storageKey, snapshot.terminal);
console.log(`🏪 DIAGNOSTIC: Set ${storageKey} to localStorage (isolated from main terminal)`);
```

#### 2. Terminal.tsx (Terminal Initialization)

**Location**: `/components/terminal/Terminal.tsx` lines 1350-1382

**Before**:
```typescript
const restoredHistory = localStorage.getItem('terminalHistory');
if (restoredHistory && restoredHistory.trim()) {
  // ... restore logic ...
  localStorage.removeItem('terminalHistory');
}
```

**After**:
```typescript
// 🚨 CRITICAL FIX: Use terminal-type-specific localStorage keys
// Sandbox terminals use sandboxTerminalHistory_${sessionId}
// Main terminal uses mainTerminalHistory
// This prevents sandbox content from bleeding into main terminal
const storageKey = sandboxMode && sandboxSession 
  ? `sandboxTerminalHistory_${sandboxSession.id}`
  : 'mainTerminalHistory';

const restoredHistory = localStorage.getItem(storageKey);

// Only restore if terminal is visible (prevents race conditions during tab switching)
if (restoredHistory && restoredHistory.trim() && isVisible) {
  console.log(`🔄 Terminal: Restoring terminal history from ${storageKey}`);
  
  // ... restore logic ...
  
  localStorage.removeItem(storageKey);
  console.log(`🗑️ Cleared ${storageKey} from localStorage`);
}
```

### Key Design Decisions

1. **Event Listener Filtering** (Primary Fix):
   - Main terminal checks `sandboxMode` and exits early
   - Prevents duplicate content writing at the source
   - Simple, performant, and foolproof
   - Log messages for debugging

2. **Checkpoint-Specific localStorage Keys** (Defense in Depth):
   - Each checkpoint gets unique localStorage key
   - Prevents conflicts between multiple checkpoints
   - Allows parallel checkpoint restoration (future feature)
   - Clean isolation between sandbox sessions

3. **Visibility Check** (Additional Safety):
   - Only restore when `isVisible === true`
   - Prevents race conditions during tab switching
   - Additional safety layer on top of event filtering
   - Handles edge cases with component lifecycle

4. **Automatic Cleanup**:
   - Remove localStorage entry after restoration
   - Prevents stale data accumulation
   - One-time restoration pattern
   - Browser storage stays clean

## Testing

### Test Case 1: Basic Checkpoint Restoration
1. Create checkpoint with terminal content
2. Close checkpoint
3. Restore checkpoint → Opens in sandbox tab
4. **Verify**: Correct content in sandbox terminal
5. **Verify**: Main terminal unaffected

### Test Case 2: Close Sandbox Tab
1. Restore checkpoint (opens in sandbox)
2. Close sandbox tab → Switches to main terminal
3. **Verify**: Main terminal content unchanged
4. **Verify**: No sandbox content pollution
5. **Verify**: Main terminal shows its own history

### Test Case 3: Multiple Checkpoints
1. Create checkpoint A
2. Create checkpoint B  
3. Restore checkpoint A
4. Restore checkpoint B (while A still open)
5. **Verify**: Each sandbox has correct isolated content
6. Close both sandboxes
7. **Verify**: Main terminal clean

## Performance Impact

- **Storage Keys**: Minimal overhead (~50 bytes per key)
- **Isolation Check**: O(1) string comparison
- **Memory**: Scales linearly with checkpoint count (auto-cleanup prevents buildup)
- **No degradation**: Same performance as original implementation

## Related Issues

This fix also resolves:
1. **Global event listener pollution** - prevents all terminals from receiving checkpoint events
2. **Checkpoint content duplication** when reopening sandbox after closing
3. **Terminal history confusion** when switching between multiple sessions
4. **State leakage** between React component instances via localStorage
5. **Race conditions** during component lifecycle and tab switching

## Future Enhancements

1. **Namespace Isolation**: Add project-specific prefix to all keys
2. **TTL Cleanup**: Auto-expire old localStorage entries (1 hour)
3. **Storage API**: Centralized storage management service
4. **Migration**: Detect and clean legacy `terminalHistory` keys

## References

- **Related Fix**: Async checkpoint filtering (prevents event loop blocking)
- **Related Documentation**: `/docs/CONNECTION_STABILITY_FIXES.md`
- **Component Documentation**: `/components/terminal/Terminal.tsx`
- **Session Management**: `/components/SessionsPanel.tsx`

---

**Status**: ✅ COMPLETE  
**Testing**: ✅ Verified with multiple checkpoints  
**Stability**: ✅ No regressions detected
