# Johnny5 Mission Control Task Creation via Function Calling (Feb 14, 2026)

## Problem
When users ask Johnny5 to do tasks, those tasks don't appear in the Mission Control button. The chat route returns conversational responses but never creates tasks in the database.

## Root Cause
- `POST /api/johnny5/tasks` endpoint exists and works
- `createTask()` function exists in task-tracker.ts
- BUT the chat route (`/api/johnny5/chat/route.ts`) never calls either

## Solution: Gemini Function Calling
Add a `createTask` tool to the Gemini API call so Johnny5 can create tasks when appropriate.

## Implementation Plan

- [x] 1. Add `createTask` import from task-tracker service
- [x] 2. Define the function declaration for Gemini's `tools` parameter
- [x] 3. Update the Gemini API call to include the function declaration
- [x] 4. Handle function call responses - execute createTask when Gemini calls it
- [x] 5. Return task creation info in the response

## Files Modified
- `app/api/johnny5/chat/route.ts` - Added function calling support

## Review

### Changes Made

1. **Import** (line 62): Added `createTask` import from task-tracker service

2. **Function Declaration** (lines ~1202-1232): Added `geminiTools` array with `createMissionTask` function:
   - `title`: Short task title (required)
   - `description`: Detailed description (required)
   - `type`: One of build/research/fix/monitor/create_pr/skill/trend (required)
   - `priority`: low/medium/high/urgent (optional, defaults to medium)

3. **API Call** (line ~1243): Added `tools: geminiTools` to the Gemini request body

4. **Function Call Handler** (lines ~1258-1335): Added logic to:
   - Detect when Gemini returns a `functionCall` instead of text
   - Execute `createTask()` with the provided arguments
   - Send function result back to Gemini for a natural language response
   - Include `taskCreated` in the result for frontend awareness

### How It Works
When a user asks Johnny5 to do something task-worthy (e.g., "research React best practices", "build me a todo app"), Gemini will:
1. Recognize this as a task request
2. Call `createMissionTask` with appropriate title/description/type/priority
3. Johnny5 executes `createTask()` to save it to the database
4. Gemini then generates a human-readable confirmation
5. The task appears in Mission Control

## Verification
1. Restart dev server (changes are server-side)
2. Open Johnny5 chat at http://localhost:3001/ide
3. Ask "Create a task to research React best practices"
4. Check Mission Control - task should appear in Queued column

---

# Fix: Johnny5 Not Responding Due to Uncaught CLI Errors (Feb 15, 2026)

## Problem
Johnny5 chat wasn't responding when ManusLive/Claude CLI returned authentication errors like "Invalid API key". The error was passed through as a "successful" response but contained error text that wasn't displayed properly.

## Root Cause
The CLI error detection code only checked for:
- 'Prompt is too long'
- 'CLI exited with code'

It did NOT check for authentication errors like:
- 'Invalid API key'
- 'API key not found'
- 'Authentication failed'
- 'ANTHROPIC_API_KEY'

## Solution
Added comprehensive CLI error pattern detection to both:
1. Moltbot chat endpoint (`/api/johnny5/moltbot/chat`)
2. Main chat endpoint (`/api/johnny5/chat`)
3. Frontend ChatTab component (fallback detection)

## Files Modified
- `app/api/johnny5/moltbot/chat/route.ts` - Added authentication error patterns
- `app/api/johnny5/chat/route.ts` - Added authentication error patterns
- `components/johnny5/chat/ChatTab.tsx` - Added client-side error detection for empty/error responses

## Changes Made

### Server-side (both routes)
```typescript
const cliErrorPatterns = [
  'Prompt is too long',
  'CLI exited with code',
  'Invalid API key',
  'API key not found',
  'Authentication failed',
  'ANTHROPIC_API_KEY',
];
const hasCliError = cliErrorPatterns.some(pattern => response.text.includes(pattern));
```

### Client-side (ChatTab.tsx)
- Check for empty responses and throw meaningful error
- Check for CLI error patterns that might slip through server validation
- Show user-friendly error messages for authentication issues

## Result
When ManusLive/Claude CLI returns authentication errors:
1. Server detects the error and triggers fallback (returns MOLTBOT_DISABLED)
2. ChatTab retries with main endpoint
3. If fallback also fails, shows clear error message to user

---

# Fix: Mission Control Tasks Showing "test task" Instead of Proper Titles (Feb 15, 2026)

## Problem
When users ask Johnny5 to create tasks, the tasks appear in Mission Control with generic titles like "test task" instead of meaningful descriptions derived from the user's actual request.

## Root Cause
1. **Gemini ignores function description instructions** - Despite explicit "NEVER use generic titles" in the tool definition, Gemini returns placeholders
2. **No argument validation** - Code passes whatever Gemini returns directly to `createTask()` without checking
3. **No fallback mechanism** - If Gemini returns generic values, there's no recovery

## Implementation Plan

- [x] 1. Add validation after extracting function call args to detect generic/placeholder values
- [x] 2. If generic title detected, derive title from user's original message
- [x] 3. Add detailed argument logging to debug what Gemini actually returns
- [x] 4. Enhance system prompt with task extraction instructions (before Gemini API call)

## Files Modified
- `app/api/johnny5/chat/route.ts` - Add validation, fallback, logging, system prompt enhancement

## Changes Made

### 1. Validation & Fallback (lines ~1283-1325)
Added code that:
- Logs detailed args from Gemini (`title`, `titleLength`, `description`, `type`, `priority`, `originalMessage`)
- Detects generic patterns: `test task`, `new task`, `task`, `placeholder`, `example`, `sample task`, `untitled`
- Checks if title is too short (< 10 chars)
- Falls back to deriving title from user's original message if generic detected
- Cleans and capitalizes the user message for a proper title

### 2. System Prompt Enhancement (lines ~1180-1200)
Added `taskExtractionInstruction` to the system prompt that:
- Explicitly tells Gemini to derive titles from user's actual message
- Provides concrete examples
- Lists FORBIDDEN generic values
- States these will be automatically rejected and replaced

## Verification Steps
1. Restart dev server: `npm run dev`
2. Open Johnny5 at http://localhost:3001/ide
3. Test task creation:
   - Say "Research React best practices for state management"
   - Check Mission Control - should show "Research React best practices..." as title
   - Say "Build me a todo app"
   - Check Mission Control - should show "Build me a todo app" not "test task"
4. Check server logs for "[Johnny5] Function args extracted" to verify what Gemini returns

---

# Fix: Time Capsule Prompt Not Appearing (Feb 15, 2026)

## Problem
The "Save this session as a Time Capsule?" prompt never appears after commits, even though the feature flag is enabled and all infrastructure (DB, API, regex) works correctly.

## Root Cause
All three commit detection paths in `server.js` require `claudeSession.inClaudeSession === true`. This in-memory state resets on every server restart and only gets set when the server observes the user typing `claude` + Enter. If the server restarts while Claude is running, or the session detection misses the command, `inClaudeSession` stays `false` and commits are silently ignored.

## Fix Plan

### Changes (server.js only - 3 locations)

- [ ] **1. Relax gate in PTY data handler (~line 2745)**
  Remove the `claudeSession.inClaudeSession` check. Keep feature flag + commit detection.

- [ ] **2. Relax gate in bridge `command:output` handler (~line 1885)**
  Same change as above.

- [ ] **3. Relax gate in bridge `claude:output` handler (~line 1686)**
  Same change as above.

### What stays the same
- Feature flag gating (`NEXT_PUBLIC_TIME_CAPSULES === 'true'`)
- Commit regex detection (`detectGitEvent`)
- Socket emit to terminal client
- Client-side prompt, auto-dismiss, save flow
- API route and DB storage

### Testing
- [ ] Make a commit in the IDE terminal and verify the prompt appears
- [ ] Click Save and verify capsule is created in DB
- [ ] Verify auto-dismiss after 30 seconds if ignored
