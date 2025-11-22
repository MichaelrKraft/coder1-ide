# Session Recovery Button Fix

**Date**: November 19, 2025  
**Issue**: Recovery button at `http://localhost:3001/ide/?recovery=true` was not working  
**Status**: ✅ Fixed

## Problem Analysis

The "Recover Session" button in the RecoveryModal was not actually restoring checkpoint data. The flow was:

1. User clicks "Recover Session" button
2. `RecoveryModal.tsx` calls `/api/recovery/restore`
3. API returns a `restoreUrl` but **doesn't load checkpoint data**
4. Page redirects to IDE but state is not restored

### Root Cause

The `/api/recovery/restore` endpoint was just generating a URL but not:
- Calling the actual checkpoint restore API
- Loading checkpoint data (files, terminal history, editor state)
- Storing data in localStorage for IDE to access

## Solution Implemented

### 1. Updated `/app/api/recovery/restore/route.ts`

**Changes**:
- Added server-side fetch to `/api/sessions/[sessionId]/checkpoints/[checkpointId]/restore`
- Actually loads checkpoint data before returning to client
- Passes checkpoint data in response for localStorage storage
- Added comprehensive logging for debugging

**Key Code**:
```typescript
// Call the actual checkpoint restore API to load checkpoint data
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const restoreApiUrl = `${baseUrl}/api/sessions/${sessionId}/checkpoints/${checkpointId}/restore`;

const restoreResponse = await fetch(restoreApiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

const checkpointData = await restoreResponse.json();
```

### 2. Updated `/components/RecoveryModal.tsx`

**Changes**:
- Stores checkpoint data in localStorage before redirect
- Saves files, terminal history, and editor content
- Sets session IDs for terminal restoration
- Marks recovery as consumed to prevent modal re-appearing

**Key Code**:
```typescript
// Store checkpoint data in localStorage for the IDE page to restore
if (data.checkpoint?.data?.snapshot) {
  const snapshot = data.checkpoint.data.snapshot;
  
  if (snapshot.files) {
    localStorage.setItem('openFiles', snapshot.files);
  }
  
  if (snapshot.terminal) {
    localStorage.setItem('terminalHistory', snapshot.terminal);
  }
  
  if (snapshot.editor) {
    localStorage.setItem('editorContent', snapshot.editor);
  }
  
  // Store session IDs for terminal
  localStorage.setItem('currentSessionId', data.sessionId);
  localStorage.setItem('ide-terminalSessionId', data.sessionId);
}

// Mark recovery as consumed
sessionStorage.removeItem('recovery-available');
sessionStorage.removeItem('recovery-timestamp');
```

## How It Works Now

### Recovery Flow (Fixed):

1. **Modal Appears**: RecoveryModal checks `/api/recovery/check` on mount
2. **User Clicks "Recover Session"**: 
   - Calls `/api/recovery/restore` with checkpoint ID and session ID
   - API fetches full checkpoint data from restore endpoint
   - Returns checkpoint data + restore URL
3. **Data Stored**: 
   - RecoveryModal stores snapshot in localStorage:
     - `openFiles` - File contents
     - `terminalHistory` - Terminal session history
     - `editorContent` - Editor state
     - Session IDs for terminal connection
4. **Redirect**: 
   - Navigates to `/ide?restored=true&checkpointId=xxx&sessionId=yyy&recovery=true`
   - IDE page detects `restored=true` and loads from localStorage
   - Terminal, editor, and files are restored to checkpoint state

### URL Parameter `?recovery=true`

The `recovery=true` parameter:
- Indicates this is a recovery restoration (vs manual checkpoint restore)
- IDE page already has logic to handle `restored=true`
- Can be used for future recovery-specific behaviors

## Testing Instructions

### Prerequisites:
- Ensure `ENABLE_SESSION_RESCUE=true` in `.env.local` ✅
- Need at least one auto-checkpoint in `data/sessions/*/checkpoints/auto/`

### Test Steps:

1. **Trigger Recovery Modal**:
   ```bash
   # Navigate to IDE with recovery parameter
   open http://localhost:3001/ide/?recovery=true
   ```

2. **Check Modal Appears**:
   - Should see "Session Recovery Available" modal
   - Shows confidence score and files to be restored
   - Two buttons: "Recover Session" and "Start Fresh"

3. **Click "Recover Session"**:
   - Watch browser console for logs
   - Should see:
     - `🛟 Starting recovery process...`
     - `📡 Calling /api/recovery/restore...`
     - `✅ Checkpoint data loaded successfully`
     - `💾 Storing checkpoint data in localStorage...`
     - Redirect to IDE

4. **Verify Restoration**:
   - Files should be open in editor
   - Terminal history should be visible
   - Editor content should match checkpoint
   - Session should be active in Sessions panel

### Expected Console Output:

```
🛟 Starting recovery process...
Checkpoint ID: checkpoint_1732012345_abc123
Session ID: session_1732012000_xyz789
📡 Calling /api/recovery/restore...
📡 Response status: 200
📡 Response data: { success: true, restoreUrl: '/ide?...' }
✅ Success! Checkpoint data loaded
💾 Storing checkpoint data in localStorage...
  ✓ Stored openFiles
  ✓ Stored terminalHistory
  ✓ Stored editorContent
  ✓ Stored session IDs
✓ Recovery marked as consumed
🔄 Redirecting to: /ide?restored=true&...
```

## Files Modified

1. ✅ `/app/api/recovery/restore/route.ts` - Added actual checkpoint restore logic
2. ✅ `/components/RecoveryModal.tsx` - Added localStorage storage before redirect

## Related Code

- Checkpoint Restore API: `/app/api/sessions/[sessionId]/checkpoints/[checkpointId]/restore/route.ts`
- Recovery Check API: `/app/api/recovery/check/route.ts`
- IDE Page Restoration: `/app/ide/page.tsx` (lines 284-356)
- SessionsPanel Restore: `/components/SessionsPanel.tsx` (lines 173-476)

## Future Improvements

1. **Auto-trigger on URL parameter**: Add logic to auto-click "Recover Session" if `?recovery=true&autoRestore=true`
2. **Better error handling**: Show specific error messages for different failure scenarios
3. **Recovery preview**: Show a diff of what changed since checkpoint
4. **Partial recovery**: Allow selecting which parts to restore (files only, terminal only, etc.)
5. **Recovery history**: Track which recoveries were successful vs failed

## Success Criteria

- ✅ Button click triggers API call
- ✅ API loads checkpoint data
- ✅ Data stored in localStorage
- ✅ Redirect to IDE happens
- ✅ IDE restores from localStorage
- ✅ Terminal, files, and editor are restored
- ✅ No errors in console
- ✅ Recovery modal doesn't reappear after success

## Notes for Future Agents

The recovery system now integrates properly with the existing checkpoint restoration system. The key insight is that the recovery modal acts as a **bridge** between the recovery detection system and the existing checkpoint restore functionality, using localStorage as the handoff mechanism.

**Important**: The IDE page already has comprehensive logic to restore from localStorage (lines 176-230 in `/app/ide/page.tsx`). We're leveraging that existing code rather than duplicating the restoration logic.
