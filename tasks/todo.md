# Johnny5 Agent Improvement Plan: Supervisor + General Assistant

## Vision

Johnny5 becomes a **general-purpose AI assistant AND coding supervisor** that lives next to the terminal in Coder1 IDE. It helps with anything (not just coding), watches what Claude Code does in the terminal, provides oversight, and can collaborate with Claude Code through shared MCP infrastructure.

```
┌─────────────────────────────────────────────────────────┐
│ Coder1 IDE                                              │
├──────────┬──────────────────────┬───────────────────────┤
│ Explorer │ Editor + Terminal    │ Johnny5 Panel         │
│ (15%)    │ (70%)                │ (15%)                 │
│          │                      │                       │
│          │  Claude Code CLI     │  General Assistant    │
│          │  runs here           │  + Supervisor         │
│          │  ↓ output ↓          │  watches terminal ←───┤
│          │                      │  remembers context    │
│          │                      │  helps with anything  │
└──────────┴──────────────────────┴───────────────────────┘
```

---

## Architecture: Current State (What Exists)

### What's Working
- Three-panel layout with Johnny5 next to terminal
- Socket.IO shared transport for terminal events and Johnny5 chat
- Bridge CLI connecting web IDE to local Claude Code
- Multi-provider chat (Moltbot → Bridge → Gemini → Anthropic API)
- Query classifier routing coding vs personal queries
- EnhancedSupervisionContext with personality types and alert thresholds
- Security framework in Johnny5Store (score, permissions, audit trail)
- SQLite database with memory tables (memory_chunks, extracted_facts, memory_fts, memory_embeddings)
- Hybrid search code (70% vector + 30% BM25)
- Fact extraction service using Gemini Flash
- Embedding service using OpenAI text-embedding-3-small

### What's Broken or Missing
- **Memory system has 8+ silent failure points** - degrades without any user feedback
- **Chat messages not persisted** - local React state only, lost on refresh
- **Terminal observation doesn't exist** - ChatTab has NO listener for terminal events
- **No MCPorter in codebase** - MCP hooks exist (`useMCPManager`) but MCPorter not implemented
- **sqlite-vec may not load on Render** - vector search silently falls back to keyword-only
- **Fact extraction needs GEMINI_API_KEY** - returns empty array if missing, no error
- **Context window limited to 10-20 messages** - ChatTab sends last 10, API limits to 20

---

## Root Cause: Why Memory Doesn't Work in Production

The exploration found **8 silent failure points** in the memory pipeline. Any one of these breaks memory without telling the user:

| # | Failure Point | File | Lines | What Happens |
|---|---------------|------|-------|-------------|
| 1 | sqlite-vec extension won't load | `johnny5-db.ts` | 432-447 | Vector table not created, `vectorTableCreated = false` |
| 2 | OPENAI_API_KEY missing | `embedding-service.ts` | 20-27 | `generateEmbedding()` returns `null`, no error |
| 3 | GEMINI_API_KEY missing | `fact-extraction-service.ts` | 106-113 | Fact extraction disabled, returns `[]` |
| 4 | FTS5 query sanitized to empty | `johnny5-db.ts` | 1555-1557 | Returns `[]` with only a warning log |
| 5 | Entire memory search fails | `route.ts` | 544-596 | try-catch continues without memory |
| 6 | buildMemoryContext fails | `route.ts` | 601-621 | try-catch continues without facts/patterns |
| 7 | FTS5 MATCH syntax error | `johnny5-db.ts` | 1583-1586 | Returns `[]`, console warning only |
| 8 | Database directory unwritable | `johnny5-db.ts` | 111-117 | THROWS - this one actually crashes |

**The fix strategy**: Don't just fix each failure - add a diagnostic layer that tells the user (and us) what's degraded.

---

## Phase 1: Fix Memory System

**Goal**: Make Johnny5 actually remember things. This is the highest-impact work.

### 1.1 Add memory health check endpoint
- [ ] Create `/api/johnny5/memory-health` route
- Returns: DB connection, table row counts, vector search available, embedding service configured, last fact extraction timestamp, FTS5 index status
- **Edge case**: DB file exists but is corrupted (test with `pragma integrity_check`)
- **Edge case**: Tables exist but are empty (distinguish "no data" from "broken")
- **Edge case**: Embedding service configured but API key revoked (test with a simple embed call)

### 1.2 Surface memory degradation to the user
- [ ] Add `memoryStatus` field to Johnny5 chat response payload
- Values: `full` (vector + keyword + facts), `partial` (keyword only, no embeddings), `minimal` (no memory search), `none` (DB unavailable)
- [ ] Show subtle indicator in ChatTab UI when memory is degraded
- NOT a blocking error - just an info badge: "Memory: keyword-only (embeddings unavailable)"
- **Edge case**: Don't spam the indicator on every message - show once per session, dismissible
- **Edge case**: Status can change mid-session (e.g., API key added while chatting)

### 1.3 Fix fact extraction pipeline
- [ ] Add structured logging to `fact-extraction-service.ts`
- Log: input message count, extraction attempted (yes/no with reason), facts found, facts stored, errors
- [ ] Verify Gemini API key is set and working in production
- [ ] Test the full loop: "my favorite color is blue" → fact extracted → stored in DB → retrieved on next query
- **Edge case**: User says "my favorite color is blue" but fact extractor is a separate async call after response - if the server crashes between response and extraction, the fact is lost. Consider: extract facts BEFORE responding (trade latency for reliability) or add a retry queue.
- **Edge case**: Duplicate facts - user says their favorite color twice. The UPSERT on `fact_key` handles this (updates value, increments reference_count). Verify this works.
- **Edge case**: Contradictory facts - "my favorite color is blue" then later "my favorite color is red". Current behavior: overwrites with latest. This is correct but should log the change.

### 1.4 Fix memory injection into prompts
- [ ] Add logging to `route.ts` lines 537-621 showing exactly what memory context is being injected
- [ ] Trace: embedding generated? → search results count → formatted context length → injected into message?
- **Edge case**: Memory context is generated but the query gets routed to Bridge (Claude Code CLI). Bridge sends the enhanced message as a CLI argument. If the memory context is very long, the CLI argument may exceed shell limits (~262,144 bytes on macOS). Add a token cap on injected context (2000 tokens max, already configured but verify enforcement).
- **Edge case**: Memory context contains special characters (quotes, backticks, dollar signs) that break shell escaping when sent to Bridge CLI. Verify `escapedPrompt` handles this.

### 1.5 Verify and document required environment variables
- [ ] Create checklist of all required env vars with their purpose:
  - `GEMINI_API_KEY` - Embeddings AND fact extraction (this is the critical one)
  - `OPENAI_API_KEY` - Embedding service (secondary, may not be used if Gemini handles it)
  - `ENABLE_ETERNAL_MEMORY=true`
  - `NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED=true`
  - `NEXT_PUBLIC_MEMORY_AUTO_INJECT=true`
- [ ] Add startup log that lists which memory features are active/inactive based on env vars
- **Edge case**: `NEXT_PUBLIC_` vars are build-time in Next.js, not runtime. If they're set after build, they won't take effect. Document this.

### 1.6 Fix chat message persistence
- [ ] Persist messages to SQLite (johnny5-db already has a `messages` table)
- [ ] On ChatTab mount, load last N messages from DB for current session
- [ ] On page refresh, messages survive
- **Edge case**: Multiple browser tabs with same session - need to handle concurrent writes. SQLite WAL mode handles this for reads but writes need care.
- **Edge case**: Very long conversations filling the DB - add a max messages per session (500?) with older messages archived.
- **Edge case**: Messages contain user-sensitive data - ensure DB is not accessible via any public API route.

---

## Phase 2: Terminal Observation (Johnny5 Watches Claude Code)

**Goal**: Johnny5 can see what Claude Code is doing in the terminal and surface relevant observations.

### Current Architecture
Terminal output flows: `Claude Code CLI → Bridge PTY → server.js (Socket.IO 'terminal:data') → Terminal.tsx (xterm.js)`

Johnny5's ChatTab currently has **zero connection** to this data stream. The terminal and chat are completely isolated.

### 2.1 Add terminal output listener in ChatTab
- [ ] In ChatTab, subscribe to Socket.IO `terminal:data` events
- [ ] Buffer incoming terminal output (don't process every byte - accumulate lines)
- [ ] Store recent terminal output in a ring buffer (last 200 lines, ~50KB max)
- **Edge case**: Terminal output includes ANSI escape codes (colors, cursor movement). Need to strip these before processing. server.js already maintains two buffers: `terminalHistoryBuffers` (with ANSI for display) and `terminalDataBuffers` (stripped for extraction). Use the stripped version.
- **Edge case**: Binary output (e.g., user runs `cat binary_file`) - detect and skip non-UTF8 content.
- **Edge case**: High-volume output (e.g., `npm install` with thousands of lines) - don't try to process all of it. Rate-limit processing to once per second, keep only the last N lines.
- **Edge case**: Multiple terminal sessions - need to listen to the correct session ID, not all sessions.

### 2.2 Parse terminal output for meaningful events
- [ ] Detect Claude Code session start/end (patterns already exist in server.js lines 523-556)
- [ ] Detect errors: stderr patterns, stack traces, "Error:", "FAIL", non-zero exit codes
- [ ] Detect file changes: "Created file", "Modified file", "Deleted file" from Claude Code output
- [ ] Detect commands: what Claude Code is running (git, npm, file operations)
- [ ] Detect completion: Claude Code finishing a task
- **Edge case**: False positives - the word "error" in a variable name or comment. Use pattern matching with context (line starts with "Error:", or stderr indicator).
- **Edge case**: Claude Code running in interactive mode (welcome screen, multi-turn). server.js already tracks this in `interactiveClaudeSessions` Map. Johnny5 should know when Claude Code is in interactive vs command mode.
- **Edge case**: User running non-Claude-Code commands in terminal. Johnny5 should distinguish between Claude Code output and regular shell output.

### 2.3 Surface observations in Johnny5 chat
- [ ] Add observation messages to ChatTab as system messages (different visual style from user/assistant)
- [ ] Observations are non-intrusive: small, collapsible, muted color
- [ ] Types of observations:
  - "Claude Code encountered an error in `auth.ts:47` - want me to look into it?"
  - "Claude Code modified 12 files in the last command"
  - "Claude Code's task appears to be complete"
- [ ] User can click observation to ask Johnny5 to help ("Explain this error", "Review these changes")
- **Edge case**: Observation overload - if Claude Code is producing lots of output, don't flood Johnny5 panel. Rate limit to max 1 observation per 10 seconds. Queue and consolidate ("3 errors detected in last minute").
- **Edge case**: User is actively chatting with Johnny5 while Claude Code is running. Observations should queue behind the current conversation, not interrupt mid-response.
- **Edge case**: Stale observations - if Claude Code error was 5 minutes ago and user is now working on something else, the observation may not be relevant. Add timestamps and auto-dismiss after 2 minutes if not interacted with.

### 2.4 Include terminal context in Johnny5's awareness
- [ ] When user asks Johnny5 a question, include recent terminal output (last 20 lines, stripped) as context
- [ ] This allows questions like "what just happened?" or "why did that fail?"
- [ ] Add to the system prompt: "Recent terminal activity: [last 20 lines]"
- **Edge case**: Terminal context contains sensitive data (API keys echoed, passwords). Strip common patterns: lines containing "key=", "token=", "password=", "secret=".
- **Edge case**: Terminal context is very large and pushes past token limits. Cap at 500 tokens, prioritize most recent lines.
- **Edge case**: Terminal has been idle for a long time - don't inject stale context. Only include if terminal activity within last 5 minutes.

---

## Phase 3: Supervision (Johnny5 Reviews Claude Code's Work)

**Goal**: Johnny5 provides intelligent oversight of Claude Code's actions, catching issues before they cause problems.

### Current State
- `EnhancedSupervisionContext.tsx` exists with personality types (strict-mentor, helpful-guide, educational-coach, collaborative-partner) and goal types (security, performance, best-practices, accessibility, testing, documentation)
- `SupervisionPromptGenerator` generates prompts based on config
- Socket events: `supervision:enable-custom`, `supervision:activated`, `supervision:deactivated`
- BUT: This system is not connected to actual terminal observation

### 3.1 Connect supervision to terminal observation
- [ ] When supervision is active AND terminal observation is active:
  - Parse Claude Code's file changes
  - Compare against supervision goals (security, best-practices, etc.)
  - Generate alerts for concerning patterns
- [ ] Supervision levels (from EnhancedSupervisionContext's `alertThreshold`):
  - `minimal`: Only critical security issues (rm -rf, force push to main, exposed secrets)
  - `moderate`: Security + obvious code quality issues
  - `comprehensive`: All of above + best practice suggestions
  - `maximum`: Everything including style and documentation
- **Edge case**: Supervision requires understanding what Claude Code is DOING, not just its output. If Claude Code writes to a file, Johnny5 needs to read that file to review it. This means Johnny5 needs file system access (already available via Bridge or MCP).
- **Edge case**: Supervision should NOT slow down Claude Code. Analysis runs async after Claude Code completes each action, not blocking.
- **Edge case**: User turns off supervision mid-session. Need clean teardown that doesn't leave orphan listeners.

### 3.2 Pre-action review (gated approval)
- [ ] Optional mode where Johnny5 reviews Claude Code's proposed actions before execution
- [ ] For destructive operations only: file deletions, git force push, `rm -rf`, production deploys
- [ ] Shows: "Claude Code wants to delete 47 files. Approve?"
- [ ] User clicks Approve/Reject/Ask Johnny5 to Review
- **Edge case**: Claude Code is in interactive PTY mode - approval flow is different. In interactive mode, Claude Code sends actions in real-time. Approval would need to intercept stdin before it reaches the PTY. This is complex - defer to Phase 5 and only do post-action review for now.
- **Edge case**: User is AFK and approval is pending. Add timeout (60 seconds) with configurable default action (auto-approve for non-destructive, auto-reject for destructive).
- **Edge case**: Network disconnect between browser and server while approval is pending. Server should auto-reject destructive actions if client disconnects.

### 3.3 Supervision memory
- [ ] Johnny5 remembers what Claude Code has done across sessions
- [ ] "Last time Claude Code worked on auth.ts, it introduced a bug on line 47"
- [ ] Store supervision observations in `extracted_facts` with fact_type='supervision'
- **Edge case**: Supervision facts can get stale as code changes. Add last_verified timestamp and deprecate old observations.
- **Edge case**: Different Claude Code sessions may work on different branches. Tag supervision facts with git branch.

---

## Phase 4: General Assistant (Not Just Coding)

**Goal**: Johnny5 helps with anything - emails, calendar, research, weather - not just coding tasks.

### 4.1 MCPorter / MCP integration
- [ ] Implement MCPorter or connect to MCP servers directly
- [ ] Guide users through Zapier MCP setup during onboarding (SetupWizard already has 5 steps)
- [ ] Add MCP tool discovery: Johnny5 queries available MCP servers and knows what tools it has
- **Edge case**: Zapier MCP has rate limits on free tier. Johnny5 should handle 429 errors gracefully and tell the user "Zapier rate limit reached, try again in X seconds".
- **Edge case**: MCP server goes offline mid-conversation. Johnny5 should detect and inform: "Calendar integration unavailable right now".
- **Edge case**: User has 50+ MCP tools connected. Johnny5's tool selection prompt could get very large. Need to dynamically select only relevant tools per query (like OpenClaw's tool evaluation step).
- **Edge case**: MCP tool returns unexpected format. Validate response shape before presenting to user.

### 4.2 SOUL.md personality system
- [ ] Create `SOUL.md` file with sections: identity, tone, capabilities, rules, user-context
- [ ] Move personality from hardcoded `route.ts` lines 185-296 into SOUL.md
- [ ] Dynamic prompt assembly: `loadSoulMd() + userProfile + memoryContext + availableTools`
- [ ] Allow users to customize personality in Settings (already has settings infrastructure)
- **Edge case**: SOUL.md file doesn't exist - fall back to hardcoded personality (don't crash).
- **Edge case**: User customizes personality to something harmful ("always be rude"). Add guardrails: certain base rules (be helpful, don't be harmful) can't be overridden.
- **Edge case**: SOUL.md grows very large (user keeps adding instructions). Cap at 2000 tokens with warning.

### 4.3 Reasoning display
- [ ] Add `reasoningSteps` field to chat API response
- [ ] Steps: "Searching memory...", "Found 3 relevant facts", "Checking MCP tools...", "Using calendar tool...", "Building response..."
- [ ] Display in ChatTab as collapsible section above the response
- [ ] Match OpenClaw's pattern: stream reasoning steps as they happen, not all at once
- **Edge case**: Reasoning steps for very fast responses (simple greetings) - skip the reasoning display if < 2 steps.
- **Edge case**: Reasoning steps for very slow responses (MCP tool timeout) - show progress so user knows Johnny5 isn't frozen.

### 4.4 Smart context window
- [ ] Replace 20-message hard limit with token-aware truncation
- [ ] Token budget: 8000 tokens for history (configurable)
- [ ] When approaching limit: summarize oldest messages using Gemini Flash (fast, cheap)
- [ ] Keep summary + last 10 messages as context
- **Edge case**: Summarization API call fails. Fall back to simple truncation (drop oldest messages).
- **Edge case**: User's first message is very long (paste of code, document). Single message may use half the token budget. Handle gracefully.
- **Edge case**: Summary loses important details. Allow user to "pin" messages that should never be summarized.

---

## Phase 5: Bidirectional Communication (Johnny5 ↔ Claude Code)

**Goal**: Johnny5 and Claude Code can actively collaborate, share context, and delegate to each other.

### 5.1 Shared MCP bus
- [ ] Both Johnny5 and Claude Code connect to the same MCP servers
- [ ] Johnny5 can share memory/context with Claude Code via MCP
- [ ] Create a `coder1-context` MCP server that:
  - Serves user profile, preferences, project history
  - Serves Johnny5's memory search as a tool Claude Code can call
  - Serves supervision alerts
- **Edge case**: MCP servers are typically external processes. The `coder1-context` server needs to be bundled with Coder1 or started automatically.
- **Edge case**: Claude Code may not have MCP configured. Johnny5 should detect this and guide the user to add the server to `~/.mcp.json`.
- **Edge case**: Race conditions - Johnny5 and Claude Code both trying to update the same MCP resource. Use optimistic locking or last-write-wins with timestamps.

### 5.2 Context injection for Claude Code
- [ ] When Claude Code starts a new session, Johnny5 can inject relevant context:
  - "User prefers Tailwind over styled-components"
  - "This project uses pnpm, not npm"
  - "Last session introduced a bug in auth.ts - be careful"
- [ ] Injection mechanism: append context to the prompt Claude Code receives via Bridge
- **Edge case**: Claude Code ignores injected context (it's just text in a prompt). Can't force compliance, but high-confidence facts at the top of context are usually respected.
- **Edge case**: Injected context contradicts what the user is asking Claude Code to do. Johnny5 should not inject opinions, only facts.

### 5.3 Task delegation
- [ ] Johnny5 can delegate coding tasks to Claude Code: "Claude Code, please fix the bug in auth.ts line 47"
- [ ] Johnny5 can delegate research tasks to MCP tools: "Search the web for React 19 migration guide"
- [ ] Delegation tracked in Johnny5's task system (already exists in useJohnny5Store)
- **Edge case**: Claude Code is busy with another task. Queue the delegation and notify user.
- **Edge case**: Delegated task fails. Johnny5 should retry once, then report failure to user with context.
- **Edge case**: Circular delegation - Johnny5 asks Claude Code, Claude Code asks Johnny5 (via MCP). Detect and break cycles.

---

## Implementation Priority & Dependencies

```
Phase 1 (Memory)          Phase 2 (Terminal)        Phase 3 (Supervision)
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│ 1.1 Health   │           │ 2.1 Listener │           │ 3.1 Connect  │
│ 1.2 Status UI│           │ 2.2 Parser   │           │ 3.2 Approval │
│ 1.3 Facts    │           │ 2.3 Surface  │           │ 3.3 Memory   │
│ 1.4 Injection│           │ 2.4 Context  │           └──────┬──────┘
│ 1.5 Env vars │           └──────┬──────┘                   │
│ 1.6 Persist  │                  │                          │
└──────┬──────┘                  │                          │
       │                         │                          │
       ▼                         ▼                          ▼
Phase 4 (General)          Phase 5 (Bidirectional)
┌─────────────┐           ┌─────────────┐
│ 4.1 MCP     │           │ 5.1 MCP bus  │
│ 4.2 SOUL.md │           │ 5.2 Inject   │
│ 4.3 Reasoning│           │ 5.3 Delegate │
│ 4.4 Context  │           └─────────────┘
└─────────────┘

Dependencies:
- Phase 2 depends on Phase 1 (memory must work for observations to be stored)
- Phase 3 depends on Phase 2 (supervision needs terminal observation)
- Phase 4 can run in parallel with Phases 2-3 (independent)
- Phase 5 depends on Phases 1-4 (needs everything working)
```

### Implementation Order (By Task)

**Sprint 1: Foundation** (Phase 1)
- [x] 1.1 Memory health check endpoint
- [x] 1.2 Memory status in chat response
  - [x] Add `memoryStatus` field to chat API response payload
  - [x] Show memory status indicator in ChatTab UI (dismissible banner)
- [ ] 1.5 Verify and document env vars
- [x] 1.3 Fix fact extraction pipeline (structured logging added)
- [x] 1.4 Fix memory injection (logging added to route.ts)
- [x] 1.6 Persist chat messages (load from DB on mount, track sessionId)

**Sprint 2: Eyes on Terminal** (Phase 2)
- [x] 2.1 Terminal output listener in ChatTab
- [x] 2.2 Parse terminal for meaningful events
- [x] 2.3 Surface observations in UI
- [x] 2.4 Include terminal context in Johnny5 awareness

**Sprint 3: Oversight** (Phase 3)
- [x] 3.1 Connect supervision to terminal observation
- [x] 3.2 Pre-action review for destructive operations
- [x] 3.3 Supervision memory (facts with type='supervision')

**Sprint 4: General Assistant** (Phase 4, can overlap with Sprint 2-3)
- [x] 4.2 SOUL.md personality system
- [x] 4.3 Reasoning display
- [x] 4.4 Smart context window
- [ ] 4.1 MCPorter / MCP tool integration

**Sprint 5: Collaboration** (Phase 5)
- [x] 5.1 Shared MCP bus (coder1-context server) -- implemented as REST API endpoints for now, MCP wrapper deferred
- [x] 5.2 Context injection for Claude Code sessions
- [x] 5.3 Task delegation between Johnny5 and Claude Code

---

## Quick Wins (Can Do Today)

These are minimal-code changes with high impact:

1. **Add startup log for memory features** - In `route.ts`, at module load, log: "Memory: vector=[yes/no], keywords=[yes/no], facts=[yes/no], embeddings=[provider]". One `console.log` block.

2. **Increase history from 20 to 50** - In `route.ts`, change `MAX_HISTORY_MESSAGES`. One line.

3. **Add explicit "remember X" command** - In `route.ts`, before the main chat flow, check if message starts with "remember that" → extract fact → store directly in `extracted_facts` with confidence 1.0. ~20 lines.

4. **Persist messages to DB** - ChatTab already has messages in state. Add `saveMessage()` call after each send/receive. Load on mount. ~30 lines frontend + already-existing DB methods.

5. **Add memory health to settings UI** - Call `/api/johnny5/memory-health` from Johnny5 settings panel, display status badges. ~40 lines.

---

## Key Design Decisions

### Why NOT integrate OpenClaw wholesale
- 845K lines, 5K files - too large to integrate
- Gateway control plane conflicts with Coder1's Bridge/Socket.IO architecture
- MCPorter + Zapier MCP already covers the 60+ tools gap
- Johnny5's memory code already exists (just broken)
- Cherry-pick patterns: SOUL.md, FallbackMemoryManager, reasoning display, session compaction

### Why terminal observation through Socket.IO (not file watching)
- Socket.IO events already carry terminal data to the frontend
- No additional server-side work needed
- Real-time with minimal latency
- Already stripped of ANSI codes in `terminalDataBuffers`

### Why Gemini for fact extraction (not Claude/OpenAI)
- Gemini Flash is fast and cheap - good for fire-and-forget async extraction
- Already configured in the codebase
- Claude API would be expensive for every single message
- OpenAI would add another API dependency

### Why keyword-only memory is an acceptable fallback
- sqlite-vec may not install on all platforms (Render, ARM, etc.)
- FTS5 is built into SQLite - always available
- Keyword search still finds "favorite color is blue" when user asks about "favorite color"
- Vector search adds semantic understanding but isn't required for basic memory

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| sqlite-vec won't install on Render | Medium | High | Keyword fallback already exists, document this is expected |
| Terminal observation floods Johnny5 | High | Medium | Rate limit to 1 observation/10s, ring buffer, consolidation |
| Memory injection breaks CLI escaping | High | Low | Test special characters, add sanitization, cap context length |
| MCP tools slow down responses | Medium | Medium | Timeout per tool (5s), show reasoning steps while waiting |
| Supervision creates false positives | Medium | High | Start with `minimal` threshold, let users tune |
| Chat persistence fills disk | Low | Low | Max 500 messages/session, auto-archive old sessions |
| Concurrent tab access | Medium | Medium | SQLite WAL mode, optimistic UI, last-write-wins |

---

## Files That Will Be Modified

### Phase 1 (Memory)
| File | Change |
|------|--------|
| `app/api/johnny5/memory-health/route.ts` | NEW - Health check endpoint |
| `app/api/johnny5/chat/route.ts` | Add memoryStatus to response, add logging, increase history limit |
| `services/memory/fact-extraction-service.ts` | Add structured logging |
| `components/johnny5/chat/ChatTab.tsx` | Add memory status indicator, persist messages |
| `lib/johnny5-db.ts` | Add message save/load methods if missing |

### Phase 2 (Terminal Observation)
| File | Change |
|------|--------|
| `components/johnny5/chat/ChatTab.tsx` | Add Socket.IO terminal listener, observation UI |
| `lib/terminal-observer.ts` | NEW - Parse terminal output for events |
| `types/johnny5.ts` | Add TerminalObservation type |

### Phase 3 (Supervision)
| File | Change |
|------|--------|
| `contexts/EnhancedSupervisionContext.tsx` | Connect to terminal observer |
| `components/johnny5/chat/ChatTab.tsx` | Show supervision alerts |
| `lib/johnny5-db.ts` | Add supervision fact storage |

### Phase 4 (General Assistant)
| File | Change |
|------|--------|
| `SOUL.md` | NEW - Personality definition file |
| `lib/soul-loader.ts` | NEW - Load and parse SOUL.md |
| `app/api/johnny5/chat/route.ts` | Use SOUL.md, add reasoning steps, smart context |
| `components/johnny5/chat/ChatTab.tsx` | Reasoning display UI |

### Phase 5 (Bidirectional)
| File | Change |
|------|--------|
| `mcp-servers/coder1-context/` | NEW - MCP server for shared context |
| `services/johnny5-bridge-service.ts` | Add context injection |
| `stores/useJohnny5Store.ts` | Add task delegation state |

---

## Review Section

### Sprint 1, Wave 2 Review (Memory Status Indicator + Persist Chat Messages)

**Date**: 2026-02-05

**Changes Made**:

1. **New file**: `app/api/johnny5/messages/route.ts`
   - GET endpoint that fetches persisted messages from SQLite
   - Accepts optional `sessionId` query param; defaults to most recent active session
   - Returns `{ success, messages, sessionId }` with try/catch error handling

2. **Modified file**: `components/johnny5/chat/ChatTab.tsx`
   - Added 3 state variables: `memoryStatus`, `memoryBannerDismissed`, `sessionId`
   - Added `useEffect` on mount to load persisted messages from `/api/johnny5/messages`
   - Added `memoryStatus` and `sessionId` extraction from chat API response after each send
   - Added dismissible memory status banner between Limited Mode banner and Messages Area
     - Red for `none`, yellow for `minimal`, blue for `partial`; hidden when `full`
   - Updated `handleClearChat` to reset all three new state variables

**TypeScript Check**: Passed (zero errors in changed files; pre-existing errors in `__tests__/test-utils/test-helpers.ts` are unrelated)

**Files touched**: 2 (1 new, 1 modified)

**Tasks completed**: 1.2 (both sub-items), 1.6

### Sprint 2 Review (Terminal Observer Service + Chat Route Terminal Context)

**Date**: 2026-02-05

**Changes Made**:

1. **New file**: `lib/terminal-observer.ts`
   - Client-side singleton service that subscribes to Socket.IO `terminal:data` events
   - `stripAnsi()` function removes ANSI escape codes, bracketed paste markers, OSC sequences, and cursor control
   - Sensitive data filtering: lines matching `key=`, `token=`, `password=`, `secret=`, `API_KEY=` (case-insensitive) are dropped
   - Binary content detection: lines with control characters (except \n, \r, \t) are skipped
   - Ring buffer of 200 entries (FIFO eviction) storing `{ line, sessionId, timestamp }`
   - Rate-limited processing: at most once per second via `lastProcessTime` check + deferred `setTimeout`
   - Incomplete line buffering in `pendingData` (data not ending in \n stays pending)
   - `detectEvents()` pattern matcher for 6 event types: error, file_change, command, completion, session_start, session_end
   - `subscribe(cb)` returns an unsubscribe function; `disconnect()` removes all socket listeners
   - `getRecentLines(n)` and `getRecentContext(maxChars)` for retrieving buffered output
   - `isClaudeActive(sessionId)` checks Claude Code interactive mode via `claude:mode:changed` events
   - Exported as `terminalObserver` singleton

2. **Modified file**: `app/api/johnny5/chat/route.ts`
   - Added `terminalContext?: string` to `ChatRequest` interface
   - Added `terminalContext` to body destructuring
   - After memory context assembly, if `terminalContext` is present and non-empty:
     - Caps at 2000 characters
     - Wraps in a `## Recent Terminal Activity` code block
     - Appends to `contextParts` array (injected alongside memory/facts context)
   - Added `console.log` trace for terminal context injection (length, capped flag, preview)

**TypeScript Check**: Passed (zero errors for `terminal-observer` and `chat/route`)

**Files touched**: 2 (1 new, 1 modified) + todo.md updated

**Tasks completed**: 2.1 (terminal output listener), 2.2 (parse terminal for events), 2.4 backend (terminal context in chat route)

### Sprint 4 Review (SOUL.md + Reasoning Steps + Smart Context)

**Date**: 2026-02-05

**Changes Made**:

1. **New file**: `SOUL.md`
   - Extracted Johnny5's base personality from hardcoded `route.ts` lines 198-218 into a standalone markdown file
   - Contains: Core Truths, Identity, Memory & Context, Be Proactive, and Vibe sections
   - Loaded at server startup and cached; falls back to hardcoded personality if file is missing

2. **Modified file**: `app/api/johnny5/chat/route.ts`
   - Added `readFileSync` and `join` imports from `fs` and `path`
   - Added `loadSoulMd()` function with `getSoulMd()` caching wrapper (loads once on first call, logs result)
   - Modified `generateJohnny5SystemPrompt()` to use `soulMd || hardcodedPersonality` for `basePersonality`
   - Added `reasoningSteps?: string[]` to `ChatSuccessResponse` interface
   - Added `reasoningSteps` array declaration after body parsing
   - Added 7 reasoning step push points: memory search type, memory results found, facts/patterns loaded, terminal context included, provider selection (Bridge path), provider selection (Gemini path), context truncation
   - Added `reasoningSteps` to success response (only included when 2+ steps exist)
   - Changed `MAX_HISTORY_MESSAGES` from 20 to 50
   - Added token-aware context truncation (section 6.1): estimates ~4 chars/token, caps history at 8000 tokens, iterates from newest to oldest, logs truncation when it occurs

**TypeScript Check**: Passed (zero errors in changed files; pre-existing errors in `__tests__/test-utils/test-helpers.ts` are unrelated)

**Files touched**: 2 (1 new, 1 modified) + todo.md updated

**Tasks completed**: 4.2 (SOUL.md personality system), 4.3 (reasoning display - backend), 4.4 (smart context window)

### Sprint 5 Review (Context Injection API + Task Delegation)

**Date**: 2026-02-05

**Changes Made**:

1. **New file**: `app/api/johnny5/context-for-claude/route.ts`
   - GET endpoint that generates a formatted context summary from Johnny5's memory
   - Pulls all high-confidence facts via `getExistingFacts()` and categorizes them into sections: User Profile, Preferences, Technical Context, Supervision Notes
   - Accepts optional `?task=` query param to include task-relevant facts via `getRelevantFacts()`
   - Caps output at 3000 characters to avoid overwhelming Claude Code's context window
   - Returns `{ success, context, factCount, hasContext }`

2. **Modified file**: `server.js` (claude:interactive:started handler, ~line 1471)
   - Changed handler callback from `(data) =>` to `async (data) =>` to support await
   - After `io.emit('claude:mode:changed', ...)`, added auto-fetch to `/api/johnny5/context-for-claude`
   - On success, emits `johnny5:claude-context-ready` event with `{ sessionId, context, factCount }` for frontend consumption
   - Uses existing `port` variable (lowercase, line 325) for the fetch URL
   - Wrapped in try/catch so failures are logged but don't disrupt session startup

3. **Modified file**: `server.js` (new socket handler, after johnny5:leave-session)
   - Added `johnny5:delegate-task` Socket.IO event handler
   - Accepts `{ sessionId, task }` payload
   - Checks if terminal session exists via `terminalSessions.get(sessionId)`
   - Checks if Claude is in interactive mode via `interactiveClaudeSessions.has(sessionId)`
   - If interactive: writes task directly to PTY (`terminalSession.pty.write(task + '\n')`)
   - If not interactive: starts a new Claude session by writing `claude "task"` to PTY
   - Emits `johnny5:delegate-result` with `{ success, sessionId, method }` or `{ success: false, error }`

**TypeScript Check**: Passed (zero errors for context-for-claude route; server.js is plain JS)

**Files touched**: 2 (1 new, 1 modified) + todo.md updated

**Tasks completed**: 5.1 (shared context via REST API, MCP wrapper deferred), 5.2 (context injection for Claude sessions), 5.3 (task delegation between Johnny5 and Claude Code)

---

## Final Implementation Summary

**Date**: 2026-02-05
**Status**: All 5 phases implemented

### Completion Status

| Sprint | Phase | Tasks | Done | Deferred |
|--------|-------|-------|------|----------|
| 1 | Memory System | 1.1-1.6 | 5/6 | 1.5 (env var docs - startup log covers this) |
| 2 | Terminal Observation | 2.1-2.4 | 4/4 | — |
| 3 | Supervision | 3.1-3.3 | 3/3 | — |
| 4 | General Assistant | 4.1-4.4 | 3/4 | 4.1 (MCPorter/MCP - needs user config decisions) |
| 5 | Bidirectional | 5.1-5.3 | 3/3 | 5.1 MCP protocol wrapper (REST API implemented) |
| **Total** | | **20** | **18/20** | **2 deferred** |

### New Files Created (8)

| File | Purpose |
|------|---------|
| `app/api/johnny5/messages/route.ts` | Load persisted chat messages |
| `lib/terminal-observer.ts` | Client-side terminal event observation service |
| `lib/hooks/useTerminalSupervision.ts` | Bridge between terminal events and supervision |
| `app/api/johnny5/supervision-facts/route.ts` | Save supervision facts to DB |
| `SOUL.md` | Johnny5 personality definition |
| `app/api/johnny5/context-for-claude/route.ts` | Generate context for Claude Code sessions |
| (Sprint 2 ChatTab observation rendering) | Integrated into existing ChatTab |
| (Sprint 3 supervision alerts rendering) | Integrated into existing ChatTab |

### Modified Files (4)

| File | Changes |
|------|---------|
| `app/api/johnny5/chat/route.ts` | memoryStatus, terminalContext, reasoningSteps, SOUL.md loader, smart context truncation, startup logging, memory injection tracing |
| `app/api/johnny5/memory-health/route.ts` | Comprehensive health diagnostics (vector search, embedding service, fact extraction, env vars, DB integrity) |
| `components/johnny5/chat/ChatTab.tsx` | Memory status banner, message persistence, terminal observations, supervision alerts, reasoning display, delegation command, context-ready listener |
| `services/memory/fact-extraction-service.ts` | Structured logging, contradictory fact detection, extractDirectFact() |
| `lib/johnny5-db.ts` | isSqliteVecLoaded() export |
| `server.js` | Auto context injection on Claude session start, task delegation handler |

### Architecture Diagram (After Implementation)

```
┌─────────────────────────────────────────────────────────────┐
│ Coder1 IDE                                                   │
├──────────┬────────────────────────┬─────────────────────────┤
│ Explorer │ Editor + Terminal      │ Johnny5 Panel            │
│          │                        │                          │
│          │  Claude Code CLI       │  ┌─ Memory Status ─────┐│
│          │  ↓ terminal:data ↓     │  │ full/partial/none    ││
│          │                        │  └──────────────────────┘│
│          │  ┌──────────────┐      │  ┌─ Supervision ───────┐│
│          │  │ terminal-    │──────│→ │ Destructive ops      ││
│          │  │ observer.ts  │      │  │ Security patterns    ││
│          │  └──────────────┘      │  └──────────────────────┘│
│          │                        │                          │
│          │  ┌──────────────┐      │  ┌─ Chat ──────────────┐│
│          │  │ Bridge CLI   │←─────│─ │ /delegate command    ││
│          │  │ or Gemini    │      │  │ Reasoning steps      ││
│          │  └──────────────┘      │  │ Terminal observations││
│          │                        │  │ Persisted messages   ││
│          │                        │  └──────────────────────┘│
│          │                        │                          │
│          │  Context auto-inject ←─│─ SOUL.md + Memory Facts │
└──────────┴────────────────────────┴─────────────────────────┘
```

### Terminal Activity Collector Review

**Date**: 2026-02-06

**New file**: `services/johnny5/terminal-activity-collector.ts`

A client-side singleton service (~330 lines) that:
- Listens to existing `terminalOutput` CustomEvents from Terminal.tsx (no changes to Terminal.tsx)
- Debounces incoming output (200ms), strips ANSI codes, splits into lines
- Classifies each line against 22 regex rules (first match wins) into 18+ event types:
  - Claude activity: `claude_active`, `claude_thinking`
  - Git: `git_commit` (extracts message), `git_push`, `git_branch`, `git_pr`
  - Tests: `test_run`, `test_pass` (extracts count), `test_fail` (extracts count)
  - Builds: `build_start`, `build_success`, `build_fail`
  - Files: `file_create`, `file_modify`, `file_delete` (all extract path)
  - Packages: `install_packages`
  - Destructive: `destructive_action` (extracts severity: critical/warning)
  - Errors: `error_encountered`
  - User input: `user_prompt` (extracts command text)
- Stores events in a ring buffer (max 1000 in memory)
- Batch-flushes to localStorage every 5 seconds (max 5000 per day per key)
- Provides event subscription system: per-type and wildcard (`*`)
- Exports `getActivityCollector()` singleton accessor and `TerminalActivityCollector` class

**TypeScript check**: Zero errors in the new file (pre-existing `@types/three` errors are unrelated)
**Node.js imports**: None (verified with grep)
**Files touched**: 1 new, 0 modified

### Remaining Work (Deferred)

1. **Task 1.5**: Document env vars formally (startup log already covers runtime check)
2. **Task 4.1**: MCPorter/MCP tool integration (needs user decisions on which MCP servers to connect)
3. **Task 5.1 MCP wrapper**: Wrap the REST API endpoints in proper MCP protocol (needs @modelcontextprotocol/sdk)
4. **Production testing**: All changes need testing on deployed Render instance with real API keys
