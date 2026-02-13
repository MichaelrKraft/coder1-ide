# Johnny5 Timeout Fix

## Problem
Johnny5 times out after 120 seconds when asked to do complex tasks via Bridge. Claude CLI needs 2-5 minutes for complex prompts, but the web-side timeout kills the request first. No cancel mechanism exists, leaving zombie CLI processes. No fallback to Gemini on timeout.

## Changes

- [x] 1. Increase Johnny5 timeout from 120s to 300s (5 minutes)
  - `services/johnny5-bridge-service.ts` - JOHNNY5_TIMEOUT: 120000 -> 300000
  - `services/bridge-manager.ts` - DEFAULT_COMMAND_TIMEOUT: 120s -> 300s

- [x] 2. Add cancel mechanism to kill CLI processes on timeout
  - `services/bridge-manager.ts` - New `cancelCommand()` method that emits `claude:cancel` to bridge socket
  - `services/johnny5-bridge-service.ts` - Calls `cancelCommand()` in timeout handler to prevent zombies
  - `bridge-cli/src/claude-executor.js` - Emits `process:spawned` event with child process reference
  - `bridge-cli/src/bridge-client.js` - Tracks non-interactive processes in `activeNonInteractiveProcesses` Map
  - `bridge-cli/src/bridge-client.js` - New `handleClaudeCancel()` method (kills interactive or non-interactive)
  - `bridge-cli/src/bridge-client.js` - Listens for `claude:cancel` socket events

- [x] 3. Add timeout choice UI and "use gemini" override
  - `app/api/johnny5/chat/route.ts` - Returns structured `timeoutOptions: true` response on COMMAND_TIMEOUT
  - `app/api/johnny5/chat/route.ts` - Detects "use gemini" in message to force Gemini provider
  - `components/johnny5/chat/ChatTab.tsx` - Shows choice message on timeout (retry or "use gemini")

## Review

### Files Modified (5 files)
1. `services/johnny5-bridge-service.ts` - Timeout increase + cancel on timeout
2. `services/bridge-manager.ts` - Timeout increase + new `cancelCommand()` method
3. `bridge-cli/src/bridge-client.js` - Cancel listener, process tracking, `handleClaudeCancel()`
4. `bridge-cli/src/claude-executor.js` - `process:spawned` event emission
5. `app/api/johnny5/chat/route.ts` - Structured timeout response + "use gemini" override
6. `components/johnny5/chat/ChatTab.tsx` - Choice message on timeout

### Design Decisions
- 5-minute timeout: Claude `--print` with 25KB prompts typically responds in 1-3 min. 5 min covers complex multi-file generation.
- SIGTERM then SIGKILL after 5s: Mirrors existing pattern in claude-executor.js
- "use gemini" natural language override: No new UI components needed, user just types it
- No auto-fallback: User gets explicit choice (retry or switch provider) instead of silent behavior change
