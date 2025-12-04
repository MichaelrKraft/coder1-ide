# Task: Bridge File & Command Routing

## Context
Route file operations and Claude commands through the bridge when connected, so users can see and edit their own local files in the web IDE.

## Plan

### Task 1: Request/Response Tracking (Foundation)
- [x] Read existing BridgeManager to understand current structure
- [x] Add `pendingRequests` Map for tracking async file operations
- [x] Add Promise-based `requestFileOperation()` method
- [x] Add `handleFileResponse()` for incoming responses
- [x] Add listener for `file:response` events in server.js

### Task 2: Modify `/api/files/tree` Route
- [x] Read current route implementation
- [x] Add bridge detection logic
- [x] Route through `requestFileOperation()` when bridge connected
- [x] Keep fallback to server filesystem

### Task 3: Modify `/api/files/read` and `/api/files/write`
- [x] Same pattern as tree route for read
- [x] Same pattern as tree route for write

### Task 4: Add UI Bridge State
- [x] Create `useBridgeConnectionState` hook
- [x] Add bridge indicator to StatusBar
- [x] Add error states for disconnect

### Task 5: Test End-to-End
- [x] Build compiles successfully (TypeScript validation passed)
- [x] Dev server starts with BridgeManager initialized
- [ ] Alpha tester: Connect bridge CLI locally
- [ ] Alpha tester: Verify file explorer shows local files
- [ ] Alpha tester: Verify file read/write works
- [ ] Alpha tester: Test disconnect handling

## Success Criteria
- [ ] User with bridge sees their local files in file explorer (not server files)
- [ ] File read/write operations work through bridge
- [ ] StatusBar shows bridge connection status
- [ ] Disconnection shows clear error message
- [ ] Users without bridge still see server sandbox (fallback)

---

## Review (December 3, 2025)

### Files Modified

1. **`services/bridge-manager.ts`** - Core changes:
   - Added `PendingFileRequest` interface
   - Added `pendingFileRequests` Map for tracking async file operations
   - Added `DEFAULT_FILE_TIMEOUT` constant (30 seconds)
   - Updated `file:response` handler to resolve pending Promises
   - Rewrote `requestFileOperation()` to return Promise that resolves with actual file data
   - Added `hasBridgeForUser()` helper method
   - Added `getBridgeForUser()` helper method

2. **`app/api/files/tree/route.ts`** - Bridge routing:
   - Added `bridgeManager` import
   - Added `useBridge` query parameter (default: true)
   - Added bridge detection and routing logic
   - Falls back to server filesystem when bridge not connected
   - Returns `source: 'local-machine'` or `source: 'server-sandbox'`

3. **`app/api/files/read/route.ts`** - Bridge routing:
   - Added `bridgeManager` import
   - Added `useBridge` query parameter
   - Routes file reads through bridge when connected
   - Handles bridge errors with specific error messages

4. **`app/api/files/write/route.ts`** - Bridge routing:
   - Added `bridgeManager` import
   - Added `useBridge` body parameter
   - Routes file writes through bridge when connected

### Files Created

5. **`lib/useBridgeConnectionState.ts`** - New React hook:
   - Provides real-time bridge connection status
   - Listens for `bridge:connected` and `bridge:disconnected` events
   - Polls for status every 30 seconds
   - Returns: `isConnected`, `bridgeId`, `platform`, `version`, `connectedAt`

6. **`components/status-bar/StatusBarCore.tsx`** - UI updates:
   - Added `useBridgeConnectionState` hook import
   - Added bridge connection indicator (green Link icon when connected)
   - Added "Connect Bridge" button (yellow Unlink icon when not connected)
   - Shows bridge platform/version on hover

### Key Design Decisions

1. **Fallback to any bridge** - For alpha testing, if no user-specific bridge is found, we fall back to any connected bridge. This simplifies testing.

2. **Promise-based file operations** - The `requestFileOperation()` method now returns a Promise that resolves with the actual file data, not just `{ success: true }`.

3. **30-second timeout** - File operations timeout after 30 seconds to prevent hanging requests.

4. **Source indicator in response** - All file API responses now include `source: 'local-machine'` or `source: 'server-sandbox'` so the UI knows where files came from.

5. **Default to bridge** - File APIs default to using bridge (`useBridge !== false`). This means connected users automatically see their local files.

### What's Left

1. **Alpha tester validation** - Real user testing with bridge CLI connected
2. **Bridge CLI file response format** - Verify the bridge CLI returns data in expected format
3. **Error handling edge cases** - Test various failure scenarios

### How to Test (Alpha Tester Instructions)

1. **Start the IDE**: `npm run dev` (runs on http://localhost:3001)
2. **Start bridge CLI on your local machine**:
   ```bash
   cd bridge-cli/package && node bin/coder1-bridge.js --local
   ```
3. **Connect bridge**: Use the pairing code shown in bridge CLI
4. **Verify StatusBar**: Should show green "Bridge" indicator (not yellow "Connect Bridge")
5. **Open file explorer**: Should show YOUR local files (not server sandbox)
6. **Click on a file**: Should open with YOUR local content
7. **Edit and save**: Should write to YOUR local machine
8. **Test disconnect**: Stop bridge CLI → Should show yellow "Connect Bridge" again

### Verification Checklist for Alpha Tester

- [ ] Bridge indicator turns GREEN when connected
- [ ] File explorer shows files from YOUR computer (check a known folder)
- [ ] Opening a file shows correct content from YOUR machine
- [ ] Saving a file writes to YOUR machine (verify with `cat` or text editor)
- [ ] Disconnecting bridge shows clear UI feedback
- [ ] Reconnecting bridge restores file access

### Build Status

- ✅ TypeScript compilation: **PASSED**
- ✅ Dev server startup: **PASSED**
- ✅ BridgeManager initialization: **PASSED**
- ⏳ Alpha tester validation: **PENDING**
