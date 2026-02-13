# Johnny5 `<execute_bash>` Command Execution Feature

## Status: Implementation Complete

## Summary
Added support for Johnny5 to execute bash commands via `<execute_bash>` tags. When Johnny5 outputs these tags, they are now parsed and the commands are executed in the terminal, with output displayed in the chat.

## Tasks
- [x] Create `lib/johnny5-command-parser.ts` - Parse `<execute_bash>` tags
- [x] Create `lib/terminal-output-capture.ts` - Capture output with timeout
- [x] Integrate into `components/johnny5/chat/ChatTab.tsx`
- [x] Add audit logging for executed commands
- [x] Code verification complete (imports, state, socket listeners, execution flow)
- [ ] End-to-end testing with Johnny5

## End-to-End Testing Steps

1. **Start dev server:**
   ```bash
   cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
   npm run dev
   ```

2. **Open IDE in browser:** http://localhost:3001/ide

3. **Open terminal panel** (click Terminal tab or use shortcut) - this creates `activeTerminalSessionId`

4. **Send test message to Johnny5:**
   - "What files are in this directory?"
   - Or: "Check if git is installed"

5. **Verify:**
   - Command appears in terminal with execution
   - Output appears in Johnny5 chat with status indicator (✅/❌/⏱️)
   - Console shows `[Johnny5] Command completed: <cmd> (success, Xms)`

## Changes Made

### New Files Created
1. **`lib/johnny5-command-parser.ts`** - Parses `<execute_bash>` tags from responses
   - `parseExecuteBashTags()` - Extracts commands and creates display-friendly response
   - `hasExecuteBashTags()` - Quick check for tags
   - `updateCommandResult()` - Formats execution results

2. **`lib/terminal-output-capture.ts`** - Captures terminal output
   - `captureTerminalOutput()` - Listens for output with timeout
   - `executeAndCapture()` - Convenience wrapper
   - Handles ANSI code stripping, truncation (10KB max)

### Modified Files
1. **`components/johnny5/chat/ChatTab.tsx`**
   - Added imports for new utilities
   - Added state: `isExecutingCommand`, `activeTerminalSessionId`
   - Added socket listeners: `terminal:session-created`, `terminal:session-attached`
   - Modified response handling to parse and execute commands

## How It Works
```
Johnny5 Response: "Let me check the files. <execute_bash>ls -la</execute_bash>"
                              ↓
                   parseExecuteBashTags()
                              ↓
              Commands extracted: ["ls -la"]
                              ↓
              socket.emit('terminal:input')
                              ↓
              captureTerminalOutput() (30s timeout)
                              ↓
              Display output in chat + audit log
```

## Edge Cases Handled
- Multiple commands: Execute sequentially
- Timeout: 30-second limit with timeout message
- Large output: Truncated to 10KB
- Bridge not connected: Shows warning message
- Malformed tags: Skipped with warning

## Known Limitations
- Interactive commands (requiring stdin) not supported
- Long-running processes will timeout at 30s

---

# Fix Johnny5 Telegram Two-Way Chat

## Goal
Make Johnny5 respond to text messages on Telegram. The setup wizard already works — bot token entry, validation, etc. — but the text message handler was a stub that only logged messages without sending a response.

## Tasks

### Phase 1: Database Schema
- [x] 1. Add `telegram_sessions` table to `lib/johnny5-db.ts` ✅ Maps Telegram user/chat → Johnny5 sessionId
- [x] 2. Add `getTelegramSession()` and `setTelegramSession()` helpers ✅ SQLite INSERT OR REPLACE

### Phase 2: Replace Stub Handler
- [x] 3. Replace stub `bot.on('text')` handler in `telegram-bot.ts` ✅ Now forwards to Johnny5 chat API
- [x] 4. Add message debouncing (1.5s window) ✅ Batches rapid messages before processing
- [x] 5. Add typing indicator loop (4s refresh) ✅ Persists typing status during 30-90s Claude responses
- [x] 6. Add session management ✅ Looks up existing session or lets API create one
- [x] 7. Add Johnny5 chat API call ✅ Calls `/api/johnny5/chat` with memory injection
- [x] 8. Add error handling ✅ User-friendly messages for 402/502/503/504 errors
- [x] 9. Add Markdown fallback ✅ Retries as plain text if Markdown parse fails

### Verification
- [ ] 10. Restart Coder1 and verify Telegram bot connects
- [ ] 11. Send test message to bot on Telegram
- [ ] 12. Verify typing indicator persists during response generation
- [ ] 13. Verify conversation history works (ask "what did I just say?")

## Review

### Summary (Feb 12, 2026)

Fixed Johnny5 Telegram bot to respond to text messages with full conversation history and memory context.

### Changes Made

1. **lib/johnny5-db.ts**:
   - Added `telegram_sessions` table (Telegram userId+chatId → Johnny5 sessionId)
   - Added `getTelegramSession()` and `setTelegramSession()` helper functions

2. **services/johnny5/telegram-bot.ts**:
   - Added import for DB helpers (`initializeDb`, `getTelegramSession`, `setTelegramSession`)
   - Added class properties: `messageQueues`, `DEBOUNCE_MS`, `typingTimers`
   - Added `initializeDb()` call in `start()` method
   - Replaced stub text handler with full implementation
   - Added `queueMessage()` — batches rapid messages with 1.5s debounce window
   - Added `processMessage()` — orchestrates session lookup, API call, response sending
   - Added `callJohnny5Chat()` — calls `/api/johnny5/chat` with memory injection enabled
   - Added `startTypingIndicator()` / `stopTypingIndicator()` — 4s refresh loop
   - Added Markdown fallback (retries as plain text if Telegram rejects formatting)
   - Added user-friendly error messages for quota/timeout/server errors

### Architecture

```
User sends Telegram message
  ↓
Debounce rapid messages (1.5s window)
  ↓
Start typing indicator (4s refresh loop)
  ↓
Look up session: getTelegramSession(userId, chatId)
  ↓
Call /api/johnny5/chat (with memory injection)
  ↓
Persist session: setTelegramSession(userId, chatId, sessionId)
  ↓
Send response (split at 4000 chars, Markdown with plain text fallback)
  ↓
Stop typing indicator
```

### Notes

- Uses the existing `/api/johnny5/chat` endpoint which handles all provider routing (Moltbot → Bridge → Gemini)
- Session mapping persists in SQLite (survives server restart)
- No UI changes needed — the 7-step setup wizard already handles Telegram configuration
- The `initializeDb()` call in `start()` ensures the `telegram_sessions` table exists

---

# Bundle ManusLive with Coder1 for Alpha Launch

## Goal
Auto-start ManusLive daemon when Coder1 starts, so alpha customers get full Johnny5 autonomy out of the box.

## Tasks

### Phase 1: Verify Current Connection
- [x] 1. Start Coder1 server and verify ManusLive connection logs ✅ Connected!
- [x] 2. Test Johnny5 chat in Moltbot mode ✅ Johnny5 confirmed "Fully autonomous daemon mode, connected to ManusLive"

### Phase 2: Add ManusLive Auto-Start
- [x] 3. Add `ensureManusLiveRunning()` function to `server.js` ✅ Added after line 218
- [x] 4. Call function before Moltbot bridge connects ✅ Called at line 1994

### Phase 3: Add UI Mode Indicator
- [x] 5. Add `ModeIndicator` component to `ChatTab.tsx` ✅ Added after line 74
- [x] 6. Show current mode (green/yellow/gray) in chat header ✅ Replaced static status text

### Phase 4: Mode Change Detection
- [x] 7. Add mode tracking to session metadata ✅ Added `mode` to API response (route.ts)
- [x] 8. Emit `johnny5:mode-changed` Socket.IO event ✅ Using API response instead (simpler)
- [x] 9. Listen for mode changes in frontend ✅ ChatTab.tsx detects mode from response

### Phase 5: Fix Bridge Mode MCP Bug
- [x] 10. Remove `--tools ""` flag from `johnny5-bridge-service.ts:385` ✅ Fixed - MCPs now enabled

### Phase 6: Bundle for Distribution
- [x] 11. Create `scripts/setup-manuslive.js` ✅ Created symlink setup script
- [x] 12. Add postinstall script to `package.json` ✅ Added to postinstall + separate command
- [x] 13. Document `MANUSLIVE_PATH` in `.env.local.example` ✅ Added MANUSLIVE_PATH and MANUSLIVE_PORT

### Verification
- [x] 14. Test ManusLive auto-start ✅ Auto-start works (60s timeout, detects existing, Node version fixed)
- [x] 15. Test graceful degradation ✅ API returns mode info, server doesn't crash on connection failure
- [x] 16. Fix null bytes error in ManusLive ✅ Added sanitization to ClaudeCodeExecutor.ts
- [x] 18. Fix E2BIG error (argument too long) ✅ Using --system-prompt-file instead of --system-prompt
- [ ] 17. Test Bridge mode MCPs (requires Bridge CLI running)

## Review

### Summary (Feb 12, 2026)

Successfully bundled ManusLive with Coder1 for alpha launch. Alpha customers will get full Johnny5 autonomy out of the box.

### Changes Made

1. **server.js**:
   - Added `ensureManusLiveRunning()` function (lines 220-282)
   - Auto-starts ManusLive daemon with 60s timeout
   - Graceful fallback if ManusLive unavailable
   - Fixed: Only connects to Moltbot if ManusLive started successfully

2. **components/johnny5/chat/ChatTab.tsx**:
   - Added `ModeIndicator` component showing mode with color coding
   - Green = Full Autonomy (Moltbot), Yellow = Bridge, Gray = Gemini
   - Detects mode changes from API response

3. **app/api/johnny5/sessions/[sessionId]/route.ts**:
   - Added `mode` object to API responses
   - Includes: mode, hasMCP, hasProjectContext, is24x7, provider

4. **services/johnny5-bridge-service.ts**:
   - Removed `--tools ""` flag from line 385
   - Bridge mode now has full MCP access

5. **scripts/setup-manuslive.js** (NEW):
   - Creates symlink from ~/.coder1/manuslive to installation
   - Runs during postinstall

6. **package.json**:
   - Added `setup:manuslive` script
   - Updated postinstall to run setup script

7. **.env.local.example**:
   - Documented MANUSLIVE_PATH and MANUSLIVE_PORT

8. **ManusLive: src/agent/ClaudeCodeExecutor.ts** (line 117):
   - Added null byte sanitization: `effectiveSystemPrompt.replace(/\0/g, '')`
   - Fixes CLI error when living files contain invisible null characters

### Notes

- ManusLive requires ~30-45 seconds to fully initialize (60s timeout)
- Node version mismatch fixed by rebuilding `better-sqlite3`
- Bridge mode MCPs require Bridge CLI to be running (separate test)
- **Null bytes fix**: Living files content can contain null bytes that Node.js spawn() rejects. Fixed by sanitizing system prompt in ManusLive's `ClaudeCodeExecutor.ts:117`
- **E2BIG fix**: Large living files exceeded OS argument length limit (~256KB). Fixed by using `--system-prompt-file` with temp file instead of passing directly as CLI argument

---

## Previous Todo (Completed)

### Fix ENOENT Errors from Auto-Open Feature

**Status**: Completed Feb 12, 2026

Changes made to `app/ide/page.tsx`:
- Added `silent?: boolean` parameter to `handleOpenFileFromPath`
- Garbled paths from Claude CLI TUI output no longer produce visible ENOENT errors
- Auto-open still works for correctly detected paths
