# Terminal Spectator Mode + Team Collab Demo

## Branch: feature/terminal-spectator

## Tasks

- [x] Create feature branch `feature/terminal-spectator`
- [x] Create demo file `demo/team-collab-demo.ts` for collaborative editing demo
- [x] Add server-side spectator infrastructure to `server.js` (data structures, event handlers, hooks, cleanup)
- [x] Create `stores/useSpectatorStore.ts` (Zustand store for spectator state)
- [x] Create `components/terminal/SpectatorTerminal.tsx` (read-only xterm overlay)
- [x] Integrate Share button into `BetaTerminal.tsx`
- [x] Integrate Live Terminals section into `TeamPanel.tsx`
- [x] Add spectator CSS to `Terminal.css`
- [x] Remove duplicate CSS class
- [x] TypeScript compiles with zero errors in changed files

## Review

### Files Created (2)
1. **`stores/useSpectatorStore.ts`** — Zustand store managing sharing/spectating state and team-wide shared terminal list
2. **`components/terminal/SpectatorTerminal.tsx`** — Read-only xterm.js component with `disableStdin: true`, orange spectator badge, socket listeners for live data

### Files Modified (4)
1. **`server.js`** (+375 lines) — Added 5 data structures, `broadcastToSpectators` throttle function, `cleanupSpectatorSession` helper, 5 socket event handlers, hooks into PTY onData/bridge output/resize handlers, cleanup in disconnect/destroy/onExit handlers. All hooks wrapped in try/catch.
2. **`components/terminal/BetaTerminal.tsx`** (+90 lines) — Added imports, spectator state hooks, socket listeners, "Share Terminal" toggle button with viewer count badge, SpectatorTerminal overlay rendering
3. **`components/team/TeamPanel.tsx`** (+38 lines) — Added "Live Terminals" section with LIVE pulse indicators and click-to-spectate buttons
4. **`components/terminal/Terminal.css`** (+12 lines) — Added spectator-pulse keyframe animation

### File Created (1, non-code)
1. **`demo/team-collab-demo.ts`** — Demo file with labeled sections for two users to collaboratively edit

### Key Design Decisions
- All spectator code in existing handlers wrapped in try/catch to never interrupt normal terminal flow
- 33ms throttle on spectator broadcasts (~30fps) to handle high-output scenarios
- 50KB scrollback buffer cap per shared session
- Team membership validated via `teamPresence` Map on every join/share
- Self-spectate prevention via server-side userId check
- Input isolation: `disableStdin: true` on client + spectator sockets never added to `session.connectedSockets`

---

# Fix: Johnny5 MCP Tools — Full Pipeline

## Phase 1: Routing & Config (DONE)

- [x] Identify root cause: query classifier defaults `general` queries to `shouldUseBridge: false`
- [x] Fix routing in `app/api/johnny5/chat/route.ts` — flip default for non-memory queries when MCP enabled
- [x] Verify TypeScript compiles (no errors in chat/route.ts)
- [x] Discover config mismatch: `getAvailableMcpTools()` read `~/.mcp.json` (Claude Desktop) not `~/.claude.json` (Claude CLI)
- [x] Fix `getAvailableMcpTools()` to read from `~/.claude.json` (primary) with `~/.mcp.json` fallback
- [x] Add youtube, transcript-api, etc. to Claude Code CLI config

## Phase 2: Bridge stdin delivery (IN PROGRESS)

- [x] `services/johnny5-bridge-service.ts` — remove prompt from shell command, send via `stdinData`
- [x] `services/bridge-manager.ts` — add `stdinData` to CommandRequest interface and socket emit
- [x] `bridge-cli/src/bridge-client.js` — destructure `stdinData` and pass to executor
- [x] `bridge-cli/src/claude-executor.js` — pipe stdin when `stdinData` present
- [ ] Test end-to-end: "Transcribe this YouTube video" → Bridge → Claude CLI → MCP tool works

## Review

### Files Modified (Phase 2)
1. **`services/johnny5-bridge-service.ts`** — Removed prompt from shell command string, added `stdinData: prompt` to bridge request
2. **`services/bridge-manager.ts`** — Added `stdinData?: string` to `CommandRequest` interface, forwarded through socket emit
3. **`bridge-cli/src/bridge-client.js`** — Destructured `stdinData` from socket data, passed to executor options
4. **`bridge-cli/src/claude-executor.js`** — Conditionally pipes stdin when `stdinData` present, writes prompt directly to process
