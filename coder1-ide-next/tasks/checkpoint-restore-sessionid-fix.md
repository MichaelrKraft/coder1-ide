# Checkpoint Restore SessionId Fix - October 7, 2025

## Problem (REAL Root Cause)
Clicking "Restore" on timeline checkpoints resulted in "Failed to restore checkpoint" error.

## Initial Diagnosis (Partial Fix)
First attempted to fix async params handling in the restore API route - this was necessary but NOT the root cause.

## Actual Root Cause
The timeline page was using the **page-level `sessionId` state** which could be empty when:
- User navigated to `/timeline` without `?sessionId=` URL parameter
- Timeline loads checkpoints from ALL sessions (works fine)
- But restore button used empty sessionId, creating malformed URL: `/api/sessions//checkpoints/${checkpointId}/restore`

**The bug**: Each checkpoint event has its own `event.details.sessionId`, but the restore button wasn't using it!

## The Fix

### File: `/app/timeline/page.tsx`

#### 1. Updated `handleRestore` function (line 50)
**Before:**
```typescript
const handleRestore = async (checkpointId: string) => {
  // ... uses page-level sessionId which might be empty
  const restoreResponse = await fetch(`/api/sessions/${sessionId}/checkpoints/${checkpointId}/restore`, {
```

**After:**
```typescript
const handleRestore = async (checkpointId: string, checkpointSessionId: string) => {
  console.log('🔄 Restoring checkpoint:', { checkpointId, checkpointSessionId });
  
  // ... uses the checkpoint's OWN sessionId
  const restoreUrl = `/api/sessions/${checkpointSessionId}/checkpoints/${checkpointId}/restore`;
  console.log('🔗 Restore URL:', restoreUrl);
  
  const restoreResponse = await fetch(restoreUrl, {
```

#### 2. Updated Restore button onClick (line 226)
**Before:**
```typescript
<button
  onClick={() => handleRestore(event.id)}
  className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs transition-colors"
>
  Restore
</button>
```

**After:**
```typescript
{event.type === 'checkpoint' && event.details?.sessionId && (
  <button
    onClick={() => handleRestore(event.id, event.details.sessionId)}
    className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs transition-colors"
  >
    Restore
  </button>
)}
```

#### 3. Enhanced error handling with detailed logging
- Console logs show: checkpoint IDs, restore URL, response status
- Better error messages show actual error details
- Handles both network errors and API errors

## How It Works Now

1. ✅ Timeline loads checkpoints from all sessions
2. ✅ Each checkpoint event includes `details.sessionId`
3. ✅ Restore button passes BOTH `event.id` and `event.details.sessionId`
4. ✅ `handleRestore` uses the checkpoint's own sessionId (not page-level state)
5. ✅ Correct URL is generated: `/api/sessions/{checkpointSessionId}/checkpoints/{checkpointId}/restore`
6. ✅ API route receives valid sessionId and checkpointId
7. ✅ Checkpoint data is loaded and applied
8. ✅ User is redirected with restored state

## Testing Instructions

1. **Navigate to timeline WITHOUT sessionId:**
   ```
   http://localhost:3001/timeline
   ```

2. **You should see checkpoints from all sessions**

3. **Click "Restore" on any checkpoint**
   - Should show confirmation dialog
   - After clicking OK, should succeed
   - Browser console shows:
     ```
     🔄 Restoring checkpoint: { checkpointId: '...', checkpointSessionId: 'session_...' }
     🔗 Restore URL: /api/sessions/session_.../checkpoints/checkpoint_.../restore
     📡 Restore response: { ok: true, status: 200 }
     ✅ Restore successful, applying data to localStorage
     ```

4. **Server console shows:**
   ```
   🔄 Restore checkpoint request: { sessionId: 'session_...', checkpointId: 'checkpoint_...' }
   📂 Looking for checkpoint at: /path/to/data/sessions/session_.../checkpoints/checkpoint_....json
   ✅ Checkpoint found and loaded successfully
   ```

5. **Redirect to IDE with restored state**

## Two-Part Fix Summary

### Part 1: API Route (restore/route.ts)
- Fixed async params handling
- Added debug logging
- Enhanced error messages

### Part 2: Timeline Page (page.tsx) - THE REAL FIX
- Updated `handleRestore` to accept checkpoint's sessionId
- Updated button onClick to pass `event.details.sessionId`
- Added comprehensive console logging
- Better error handling and user feedback

## Why This Happened

The timeline page has two modes:
1. **With sessionId** (`/timeline?sessionId=xyz`) - Shows checkpoints for that session
2. **Without sessionId** (`/timeline`) - Shows checkpoints from ALL sessions

Mode 2 is perfectly valid and useful! But the restore button was using the page-level `sessionId` state which is empty in mode 2.

**Solution**: Use each checkpoint's own sessionId from `event.details.sessionId` instead of page-level state.

## Files Modified

1. `/app/api/sessions/[sessionId]/checkpoints/[checkpointId]/restore/route.ts` (Part 1)
   - Added RouteParams interface
   - Fixed async params handling
   - Enhanced logging and error messages

2. `/app/timeline/page.tsx` (Part 2 - THE KEY FIX)
   - Updated `handleRestore` signature: added `checkpointSessionId` parameter
   - Updated button onClick: passes `event.details.sessionId`
   - Added comprehensive debugging logs
   - Better error handling

---
**Status:** ✅ FULLY FIXED  
**Agent:** Claude Code (October 7, 2025)  
**Complexity:** Medium - Required tracing data flow from timeline API → timeline page → restore handler → API route  
**Lesson:** Always check where data comes from vs where it's being used!
