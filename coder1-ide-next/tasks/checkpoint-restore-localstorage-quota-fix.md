# Checkpoint Restore localStorage Quota Fix - October 7, 2025

## Problem
After fixing the sessionId issue, checkpoint restore was working but failing with:
```
Failed to restore checkpoint: Failed to execute 'setItem' on 'Storage': Setting the value of 'terminalHistory' exceeded the quota.
```

## Root Cause
- **localStorage has a 5-10MB quota** per origin in most browsers
- Terminal history can easily exceed this with:
  - ANSI escape codes (colors, cursor movements)
  - Verbose command output
  - Long-running sessions with many commands
  - Claude Code "thinking" animations and status lines
- A single checkpoint's `terminalHistory` can be **5-15MB** or more

## The Fix

### Smart Quota Handling with Truncation Fallback

**File**: `/app/timeline/page.tsx` (lines 88-131)

```typescript
// Apply the restored data to localStorage with quota handling
if (data.checkpoint?.data?.snapshot) {
  const snapshot = data.checkpoint.data.snapshot;
  
  // Files - should be small, restore normally
  if (snapshot.files) {
    try {
      localStorage.setItem('openFiles', snapshot.files);
    } catch (e) {
      console.warn('⚠️ Could not restore files:', e);
    }
  }
  
  // Terminal history - can be VERY large, truncate if needed
  if (snapshot.terminal) {
    try {
      // First try to store as-is
      localStorage.setItem('terminalHistory', snapshot.terminal);
      console.log('✅ Terminal history restored successfully');
    } catch (e) {
      // If quota exceeded, truncate to last 100KB (roughly last 1000 lines)
      console.warn('⚠️ Terminal history too large for localStorage, truncating...');
      const maxSize = 100 * 1024; // 100KB
      const truncated = snapshot.terminal.slice(-maxSize);
      try {
        localStorage.setItem('terminalHistory', truncated);
        console.log(`✅ Terminal history truncated to ${truncated.length} characters`);
      } catch (e2) {
        // If still too large, skip terminal history restoration
        console.warn('⚠️ Could not restore terminal history even after truncation');
        localStorage.removeItem('terminalHistory'); // Clear any existing data
      }
    }
  }
  
  // Editor content - should be small, restore normally
  if (snapshot.editor) {
    try {
      localStorage.setItem('editorContent', snapshot.editor);
    } catch (e) {
      console.warn('⚠️ Could not restore editor content:', e);
    }
  }
}
```

## How It Works

### Three-Tier Fallback Strategy

1. **Try Full Restore First**
   - Attempt to restore complete terminal history
   - If successful, user gets full context ✅

2. **Truncate on Quota Error**
   - If quota exceeded, keep last 100KB (~1000 lines)
   - Preserves most recent terminal output
   - Enough for context without hitting quota ⚠️

3. **Skip on Second Failure**
   - If even truncated data is too large
   - Clear terminal history completely
   - Other data (files, editor) still restored ❌

### Why This Works

- **Files**: Usually just a JSON array of file paths (<1KB)
- **Editor Content**: Current file content (typically <100KB)
- **Terminal History**: The problematic one (can be 5-15MB+)

By handling terminal history specially, we can restore most data even when quota is hit.

## Testing

### Test Case 1: Small Checkpoint (< 5MB total)
1. Create checkpoint with minimal terminal history
2. Click "Restore"
3. **Expected**: All data restored, console shows:
   ```
   ✅ Terminal history restored successfully
   ```

### Test Case 2: Large Checkpoint (5-10MB terminal history)
1. Create checkpoint after long terminal session
2. Click "Restore"
3. **Expected**: Files and editor restored, terminal truncated:
   ```
   ⚠️ Terminal history too large for localStorage, truncating...
   ✅ Terminal history truncated to 102400 characters
   ```

### Test Case 3: Huge Checkpoint (> 10MB terminal history)
1. Create checkpoint with massive terminal output
2. Click "Restore"
3. **Expected**: Files and editor restored, terminal skipped:
   ```
   ⚠️ Terminal history too large for localStorage, truncating...
   ⚠️ Could not restore terminal history even after truncation
   ```

## Browser Console Output Examples

### Success (Full Restore)
```
🔄 Restoring checkpoint: { checkpointId: 'checkpoint_...', checkpointSessionId: 'session_...' }
🔗 Restore URL: /api/sessions/session_.../checkpoints/checkpoint_.../restore
📡 Restore response: { ok: true, status: 200 }
✅ Restore successful, applying data to localStorage
✅ Terminal history restored successfully
```

### Partial Success (Truncated Terminal)
```
🔄 Restoring checkpoint: { checkpointId: 'checkpoint_...', checkpointSessionId: 'session_...' }
🔗 Restore URL: /api/sessions/session_.../checkpoints/checkpoint_.../restore
📡 Restore response: { ok: true, status: 200 }
✅ Restore successful, applying data to localStorage
⚠️ Terminal history too large for localStorage, truncating...
✅ Terminal history truncated to 102400 characters
```

### Minimal Success (Terminal Skipped)
```
🔄 Restoring checkpoint: { checkpointId: 'checkpoint_...', checkpointSessionId: 'session_...' }
🔗 Restore URL: /api/sessions/session_.../checkpoints/checkpoint_.../restore
📡 Restore response: { ok: true, status: 200 }
✅ Restore successful, applying data to localStorage
⚠️ Terminal history too large for localStorage, truncating...
⚠️ Could not restore terminal history even after truncation
```

## Why Not Fix at Save Time?

You might ask: "Why not truncate when saving the checkpoint?"

**Answer**: We already do! The checkpoint save API filters terminal history (see `app/api/checkpoint/route.ts`). But even after filtering:
- Removing Claude status lines
- Removing thinking animations
- Cleaning up ANSI codes

The terminal history can **still** be 5-10MB for long sessions with lots of output.

## Alternative Approaches Considered

### 1. Don't Store Terminal History in localStorage ❌
- **Problem**: Would lose terminal context on restore
- **Why Not**: Terminal context is valuable for debugging

### 2. Compress Terminal History ❌
- **Problem**: Adds complexity, still might hit quota
- **Why Not**: Not worth the overhead

### 3. Store Only in Server (Not localStorage) ❌
- **Problem**: Can't restore without server call
- **Why Not**: Offline/fast restore is valuable

### 4. Current Solution: Smart Truncation ✅
- **Benefits**: 
  - Tries full restore first
  - Graceful degradation
  - User always gets *something* restored
  - Clear console feedback about what happened

## User Experience

### Before Fix
```
[Click Restore]
→ ❌ "Failed to restore checkpoint: ... exceeded the quota"
→ 😞 Nothing restored, user stuck
```

### After Fix
```
[Click Restore]
→ ✅ Files restored
→ ✅ Editor content restored
→ ⚠️ Terminal history truncated (last 1000 lines)
→ 🎉 User back to work with most context intact
```

## Files Modified

1. `/app/timeline/page.tsx` (lines 88-131)
   - Wrapped all localStorage.setItem calls in try-catch
   - Added three-tier fallback for terminal history
   - Added detailed console logging
   - Ensured restore succeeds even if some data can't be saved

## Related Issues

This completes the checkpoint restore fix trilogy:

1. ✅ **Async Params Fix** - Fixed Next.js 14 params handling
2. ✅ **SessionId Fix** - Used checkpoint's own sessionId
3. ✅ **Quota Fix** - Handled localStorage quota with truncation

All three were needed for checkpoint restore to work reliably!

---
**Status:** ✅ FULLY FIXED  
**Agent:** Claude Code (October 7, 2025)  
**Impact:** Checkpoint restore now works even with large terminal histories  
**User Experience:** Graceful degradation instead of complete failure
