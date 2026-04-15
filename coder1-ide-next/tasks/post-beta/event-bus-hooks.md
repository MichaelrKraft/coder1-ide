# Event Bus via Claude Code Hooks — Post-Beta Implementation

> **Status:** 🅿️ **PARKED** — plan approved 2026-04-09, implementation deferred until after beta.
> **Origin:** Inspired by Fareed Khan's "Building Claude Code with Harness Engineering" article (Apr 2026).
> **Estimated scope:** 5 files touched (2 new, 3 modified), zero new dependencies, zero bridge-cli changes.
> **Risk:** Very low. Fails silently. Doesn't touch the bridge security boundary.

## Why this is parked and not dropped

This plan unlocks three things Coder1 needs but doesn't have today:
1. **Structured visibility into what Claude is doing inside a session** (not just raw PTY bytes).
2. **A foundation for usage tracking, billing, and per-user stats.**
3. **A hook layer for future team-collaboration features** (live activity feed, multi-user awareness, policy enforcement).

It's parked because none of the above are blockers for beta — but all of them will matter within weeks of beta launching. Pick this up when: (a) beta is stable, (b) you want to ship the "live activity feed" feature, or (c) you need usage analytics for billing.

---

# Coder1 Event Bus — Implementation Plan (v1)

## Context

Mike wants to implement the "event bus" pattern from Fareed Khan's Claude Code harness article in Coder1 IDE. The value: emit structured events (`SessionStart`, `PreToolUse`, `PostToolUse`, `Notification`, `Stop`) when Claude Code runs actions inside a Coder1 session, then broadcast those events over existing Socket.IO infrastructure. This unlocks team notifications, usage tracking, and multi-user awareness without modifying the agent loop or bridge CLI — directly supporting Coder1's differentiators (Google Docs-like collab + observability).

**Key architectural insight from exploration:** Coder1 already has the broadcast pipe — `global.emitBridgeEvent()` at `server.js:2640`, Socket.IO rooms by `teamId`, and React hook patterns in `lib/useBridge*.ts`. What's missing is the **source** of structured tool-call events. PTY output is raw bytes; parsing ANSI is fragile. Claude Code's native hooks system in `.claude/settings.json` is already partially used (`PostToolUse` → `auto-test-on-edit.sh`), so we extend a known-good integration point rather than inventing a new one.

**Scope for v1:** Wire the emission → broadcast → subscription path end-to-end. No UI component, no persistence, no multi-user merge logic, no bridge-cli changes. Those are v2.

---

## Recommended Approach

Use Claude Code's built-in hooks to POST structured events to a new Next.js API route, which broadcasts them via the existing `emitBridgeEvent` pipeline to Socket.IO clients.

### Data Flow

```
Claude Code (user machine)
  └─ hook fires (PreToolUse, PostToolUse, etc.)
      └─ node .claude/hooks/emit-event.js <event-name>
          └─ reads JSON from stdin (tool_name, tool_input, session_id)
              └─ POST http://localhost:3001/api/bridge/events
                  └─ global.emitBridgeEvent('tool:use', payload, roomId?)
                      └─ io.to('team:X').emit('tool:use', payload)
                          └─ useToolEvents() React hook buffers last 100
```

### Files to Modify

**1. `coder1-ide-next/.claude/hooks/emit-event.js` (NEW, ~45 lines)**
Node script invoked by Claude Code for each hook. Uses native `http` module (no new deps). Responsibilities:
- Read JSON payload from stdin (Claude Code hook protocol — contains `tool_name`, `tool_input`, `tool_response`, `session_id`, `hook_event_name`).
- Read event name from `process.argv[2]`.
- POST `{event, toolName, toolInput, toolResponse, sessionId, timestamp}` to `http://localhost:3001/api/bridge/events`.
- **Fails silently** (try/catch, 500ms timeout, `process.exit(0)` on any error) so hook failures never break Claude Code execution.

**2. `coder1-ide-next/.claude/settings.json` (EXTEND, ~30 lines added)**
Append hook entries alongside the existing `PostToolUse → auto-test-on-edit.sh`:
- `PreToolUse` with matcher `tools: ["*"]` → `node .claude/hooks/emit-event.js PreToolUse`
- Second `PostToolUse` entry with `tools: ["*"]` → `node .claude/hooks/emit-event.js PostToolUse`
- `SessionStart` → `node .claude/hooks/emit-event.js SessionStart`
- `Stop` → `node .claude/hooks/emit-event.js Stop`
- `Notification` → `node .claude/hooks/emit-event.js Notification`

Leave existing `auto-test-on-edit.sh` entry untouched — Claude Code supports multiple hook entries per event.

**3. `coder1-ide-next/app/api/bridge/events/route.ts` (NEW, ~35 lines)**
Next.js App Router API route. `POST` handler:
- Validates `event` field exists; returns `400 { error: 'event is required' }` if missing (matches the validation pattern from `CLAUDE.md` security rules).
- Constructs normalized payload: `{event, toolName, toolInput, toolResponse, sessionId, timestamp, source: 'claude-code-hook'}`.
- Calls `global.emitBridgeEvent('tool:use', payload)` — the global is set up in `server.js:2636-2647` and is accessible from API routes.
- Returns `{ok: true}`.
- Wrapped in try/catch that returns 500 with `error: 'broadcast failed'` (never leaks internals per security rules).
- **No auth for v1** — localhost-only. Add bridge-token auth in v2 when exposed beyond localhost.

**4. `coder1-ide-next/lib/useToolEvents.ts` (NEW, ~30 lines)**
React hook mirroring `lib/useBridgeSessionData.ts`:
- Signature: `useToolEvents(options?: { sessionId?: string; max?: number })`
- Imports the socket singleton from `lib/socket.ts`.
- Subscribes to `tool:use` events, filters by `sessionId` if provided.
- Returns `{events: ToolEvent[], clear: () => void}` — ring buffer capped at `max` (default 100).
- Cleans up listener on unmount.

**5. `coder1-ide-next/server.js` (EXTEND, ~8 lines in `global.emitBridgeEvent`)**
Currently at line 2640-2647, `emitBridgeEvent(eventName, data)` calls `io.emit()` (broadcasts to ALL clients). Add optional 3rd parameter for room scoping:

```js
global.emitBridgeEvent = (eventName, data, roomId) => {
  try {
    if (roomId) io.to(roomId).emit(eventName, data);
    else io.emit(eventName, data);
    // ... existing log
  } catch (error) { /* existing */ }
};
```

Backward-compatible — all existing callers work unchanged. v1 passes no `roomId` (global broadcast). v2 adds team scoping when teamId is passed in the hook payload.

### Files to Reuse (no changes)

- `server.js:2636` → `global.io` exposure
- `server.js:2640-2647` → `global.emitBridgeEvent()` (the broadcast primitive)
- `lib/socket.ts` → client socket singleton
- `lib/useBridgeSessionData.ts` → React hook pattern to mirror
- `.claude/settings.json:2-18` → existing hook entry as a copy-paste template

### Explicitly Out of Scope (v2+)

| Item | Why deferred |
|------|--------------|
| UI component to display event stream | v1 is wiring, not display. Can be tested via browser devtools socket listener. |
| Database persistence of events | Adds schema + migration complexity. Live stream only for v1. |
| Multi-user event merge/conflict resolution | Requires team scoping first. |
| Bridge-token auth on `/api/bridge/events` | v1 is localhost-only. Auth matters when endpoint is exposed. |
| Per-session `.claude/settings.local.json` injection by bridge-cli | v1 only works when Claude runs inside the Coder1 repo directory. Bridge-cli injection comes when non-Coder1 projects need this. |
| Team-scoped broadcast in v1 | Hook payload doesn't know about Coder1 teams yet. Global broadcast is simpler and sufficient for first test. |

---

## Verification

### 1. Local smoke test (happy path)
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
# In another terminal:
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
claude "list the files in this directory"
```
**Expected:** Next.js server console shows `🔗 [BRIDGE] Emitted tool:use` log lines for each `Read`/`Bash`/`Glob` call Claude makes. At minimum, 1× `SessionStart` + 1× `PreToolUse` + 1× `PostToolUse` + 1× `Stop`.

### 2. Event payload inspection
Open browser devtools on `http://localhost:3001/ide`. In console:
```js
// Import the existing socket singleton from lib/socket.ts
// If not exposed globally, add temporary: window.__socket = socket in lib/socket.ts
window.__socket.on('tool:use', (e) => console.log('[tool:use]', e));
```
Run a Claude command in the Coder1 terminal. **Expected:** console logs `{event: 'PreToolUse', toolName: 'Bash', toolInput: {...}, sessionId: '...'}` objects.

### 3. Fail-safe test
```bash
# Stop the Next.js server entirely
pkill -f "next dev"
# From coder1-ide-next directory:
claude "echo hello"
```
**Expected:** Claude Code completes normally, no errors bubble up to the user, no hung processes. The hook script POST fails with ECONNREFUSED but the `try/catch` + `process.exit(0)` swallow it.

### 4. React hook test (optional but recommended)
Create a one-off debug page `app/debug/events/page.tsx` that uses `useToolEvents()` and renders `<pre>{JSON.stringify(events, null, 2)}</pre>`. Navigate to `/debug/events`, trigger Claude actions, watch events appear live. **Delete the debug page after verifying** — not part of v1 shipping surface.

### 5. Regression test
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
# Touch a .ts file to trigger existing auto-test-on-edit.sh
claude "add a comment to lib/socket.ts"
```
**Expected:** Both hooks fire — the existing `auto-test-on-edit.sh` runs AND the new `emit-event.js` POSTs. Prove no regression on the existing integration.

### Review section (post-implementation)
After executing, append to `coder1-ide-next/tasks/todo.md`:
- List of 5 files touched (2 new, 3 modified)
- Confirmation that existing `auto-test-on-edit.sh` behavior is unchanged
- Whether room scoping was added in `emitBridgeEvent` (yes/no + why)
- Any drift from this plan and the reason
- Next steps toward v2 (UI component, persistence, team scoping)
