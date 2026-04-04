# Agent Hub — Remaining Work Plan

**Date**: 2026-04-03
**Branch**: `feature/agent-hub` (worktree at `.worktrees/agent-hub/coder1-ide-next`)
**Dev server**: `PORT=3003 npm run dev` → `http://localhost:3003/ide/agent-hub/dashboard`

---

## Phase 7: Agent Detail UX Redesign (Priority 1)

**Goal**: When you click on an agent, the detail view should be chat-first — Command Center is the main panel, not buried at the bottom.

### Current state
- Agent detail is a long scrollable page: header → stats → latest run → analytics → tasks → configuration → memory → command center button (below fold)
- Command Center is a collapsible panel at the very bottom that most users won't find

### Proposed layout
```
┌─────────┬────────────────────────────────────────────────┐
│ Agent   │  CEO Agent  ● Connected          [Edit] [Pause]│
│ List    │                                                │
│ (220px) │  ┌──────────────────────────────────────────┐  │
│         │  │ Chat messages (scrollable)               │  │
│ ● CEO   │  │                                          │  │
│ ○ FE    │  │ You: What's the status?                  │  │
│ ○ BE    │  │ CEO: Frontend Dev completed 3 tasks...   │  │
│         │  │                                          │  │
│         │  └──────────────────────────────────────────┘  │
│         │                                                │
│         │  [Type a message...                    Send ↵] │
│         │                                                │
│         │  ── Agent Info (collapsible) ──────────────── │
│         │  Model: Sonnet | Budget: None | Runs: 0       │
│         │  Memory (0) | Last run: Never                  │
└─────────┴────────────────────────────────────────────────┘
```

### Changes
- **`app/ide/agent-hub/agents/page.tsx`** — narrow list (220px) + detail (done)
- **`components/agent-hub/agents/AgentDetail.tsx`** — major rewrite: chat conversation is the main content area (70% height), agent stats/config collapsed into an accordion below
- **`components/agent-hub/agents/CommandCenter.tsx`** — no longer a toggle button; always visible as the primary panel when agent is selected

---

## Phase 8: Expanded Settings Page (Priority 2)

**Goal**: Settings page has 5 sections instead of just Owner Profile.

### Sections
1. **Owner Profile** (exists) — `~/.coder1/owner.md` editor
2. **Project Context** — dropdown to select project → edit `{workspacePath}/CONTEXT.md` from UI
3. **Agent Defaults** — default model, budget, max concurrent runs, system prompt template (saved to `~/.coder1/agent-defaults.json`)
4. **Budget Controls** — global monthly cap, alert threshold, current month spend display
5. **Notifications** — default Telegram token/chatId, notification trigger checkboxes

### New files (8)
```
components/agent-hub/settings/ProjectContextEditor.tsx
components/agent-hub/settings/AgentDefaultsEditor.tsx
components/agent-hub/settings/BudgetSettings.tsx
components/agent-hub/settings/NotificationSettings.tsx
app/api/agent-hub/settings/project-context/route.ts
app/api/agent-hub/settings/agent-defaults/route.ts
app/api/agent-hub/settings/budget/route.ts
app/api/agent-hub/settings/notifications/route.ts
```

---

## Phase 9: Per-Agent Tools (MCP + Skills) (Priority 3)

**Goal**: Each agent can have its own MCP servers and skills assigned via the UI.

### Changes
- **Agent form** — add "Tools" section with:
  - Skills: searchable checkbox list from `~/.claude/skills/`
  - MCP Servers: multi-select from available MCP configs in `~/.mcp.json`
- **Bridge integration** — pass `--mcp-config` flags when spawning Claude Code for agents with custom MCP configs
- **DB** — skills field already exists (JSON array); add `mcp_servers` TEXT field (JSON array of server names)

---

## Phase 10: Command Center Bridge Testing (Priority 4)

**Goal**: Verify Command Center works end-to-end with a real bridge connection.

### Steps
1. Start bridge: `cd bridge-cli && node src/index.js start --server http://localhost:3003`
2. Open Command Center on an agent
3. Verify: socket connects → bridge spawns Claude Code PTY → messages stream back
4. Test: idle timeout (15 min), stop button, chat history persistence
5. Fix any issues found during testing

---

## Phase 11: Security Hardening (Priority 5)

### From code review findings
- **Token redaction** — `AGENT_HUB_INTERNAL_TOKEN` leaks into prompt logs via supervisor section. Redact from stored stdout chunks.
- **Auth consistency** — memory and summarize API routes use `getUserId()` → `'local-user'` fallback instead of `getAuthenticatedUserId()`. Align with other routes.
- **Error messages** — don't return `error.message` (may contain SQLite schema details) in production API responses

---

## Phase 12: Johnny5 Removal (Priority 6)

**Goal**: Remove Johnny5 daemon code from Coder1. Agent Hub subsumes its purpose.

### Steps (requires separate audit/approval)
1. Audit `components/mission-control/` — identify overlap with Agent Hub
2. Identify all Johnny5 integration code (server.js, lib/, components/)
3. Remove Johnny5 files
4. Update navigation, imports
5. Keep `NEXT_PUBLIC_ENABLE_AGENT_DASHBOARD` flag unchanged (old mission-control)

---

## Phase 13: Production Deployment (Priority 7)

### Steps
1. Merge `feature/agent-hub` → `master`
2. Set `NEXT_PUBLIC_ENABLE_AGENT_HUB=false` in production (invisible)
3. Deploy to Render
4. Beta: enable for specific users via feature flag
5. GA: enable globally

---

## Known Bugs to Fix

| Bug | Severity | Notes |
|-----|----------|-------|
| Data lost on server restart (DB recreation) | Medium | Don't delete DB; migrateSchema handles new columns |
| userId mismatch (API calls from CLI vs browser) | Medium | CLI calls use 'default', browser uses real userId |
| Server needs manual restart for server.js changes | Low | Expected in dev mode; not an issue in production |
| Agent Hub pages slow on first load in dev | Low | Next.js dev compilation; not an issue in production |
| Default route from main IDE goes to /agents not /dashboard | Medium | Need to find IDE sidebar link and change to /agent-hub |
