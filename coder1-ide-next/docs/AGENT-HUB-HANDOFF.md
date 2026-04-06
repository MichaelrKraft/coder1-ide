# Agent Hub — Handoff Document
**Date:** 2026-04-03
**Previous session:** 6.5 hours, ~7,200 lines of code across 60+ files
**Branch:** `feature/agent-hub` (pushed to GitHub, NOT merged to master)

---

## What Was Built

The Coder1 Agent Hub — a Paperclip-style agent orchestration platform embedded in the IDE. Users create AI agents, assign them tasks, watch them work, and approve/reject their output.

### Completed Phases

| Phase | Status | What it does |
|-------|--------|-------------|
| 0-4 | Done | Core: Agents CRUD, Tasks Kanban, Runs (live stdout), Goals (paid tier), code-gated approvals |
| 6 | Done | Git worktree isolation (each run gets `~/.coder1/agent-worktrees/{runId}`), task scheduling (daily/weekly/monthly/once), behavioral agent hierarchy (CEO delegates to subordinates via internal API) |
| 6b | Done | Visual org chart with card boxes + connector lines, Dashboard with stat cards + activity feed, Agent detail analytics (charts, latest run, recent tasks) |
| 6c | Done | Projects with colored dots in sidebar, Pause/Resume toggle, Per-agent Telegram bots (each agent gets its own @BotFather token) |
| 6d | Done | Issues panel (replaces Tasks tab — status-grouped list with C1-N IDs, rich detail with properties sidebar, comments), Calendar (monthly grid with event dots), DB migration system (`migrateSchema()` adds columns to older databases), List/Board view toggle |
| 6e | **PLANNED** | Agent Memory (FTS5 RAG), Context Stack (owner.md + project CONTEXT.md), Command Center (floating chat panel using Claude Code subscription) |

### Feature Flag
Everything is gated behind `NEXT_PUBLIC_ENABLE_AGENT_HUB=true`. Set to `false` (default) and the entire Agent Hub is invisible.

---

## Where the Code Lives

**Git worktree:** `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/.worktrees/agent-hub/coder1-ide-next`

**Branch:** `feature/agent-hub` (15 commits ahead of master)

**Key directories (all paths relative to worktree root):**
```
lib/agent-hub/           — Backend: db.ts, agents.ts, tasks.ts, runs.ts, projects.ts,
                           comments.ts, goals.ts, telegram.ts, bridge-integration.ts,
                           git-tracker.ts, zombie-detector.ts, cost-estimator.ts,
                           paywall.ts, skills-registry.ts, auth.ts

app/api/agent-hub/       — API routes: agents/, tasks/, runs/, projects/, goals/,
                           internal/create-task/, dashboard/

app/ide/agent-hub/       — Pages: dashboard/, agents/, tasks/, runs/, goals/, calendar/

components/agent-hub/    — UI: agents/ (AgentList, AgentDetail, AgentForm, AgentHierarchy,
                           AgentStatusChip), tasks/ (TaskKanban, TaskCard, TaskDetail,
                           TaskForm, PreRunChecklist, PriorityChip, CostEstimate),
                           runs/ (RunList, RunViewer, RunApproval, RunStatusChip),
                           goals/ (GoalList, GoalDetail, GoalStatusChip, PaywallGate),
                           issues/ (IssueList, IssueDetail, IssueForm),
                           calendar/ (AgentHubCalendar),
                           dashboard/ (AgentHubDashboard),
                           shared/ (EmptyState), AgentHubLayout.tsx
```

---

## Database

**SQLite via better-sqlite3** at `data/agent-hub.db`

**Tables:**
- `agent_hub_agents` — agent definitions (with supervisor_agent_id, project_id, telegram fields)
- `agent_hub_tasks` — tasks/issues (with schedule fields, issue_number, labels, project_id)
- `agent_hub_runs` — execution records (with worktree_path)
- `agent_hub_run_log_chunks` — stdout/stderr storage
- `agent_hub_goals` — high-level objectives (paid tier)
- `agent_hub_projects` — project groupings with colored dots
- `agent_hub_comments` — comments on tasks/issues

**IMPORTANT:** If the DB was created before the latest schema changes, `migrateSchema()` in `db.ts` automatically adds missing columns via `ALTER TABLE`. But if you get errors, delete `data/agent-hub.db` and restart — it recreates with the full schema.

---

## Known Issues / Bugs

1. **Projects sidebar "+" button** — works but the DB must have the projects table. Delete and recreate DB if projects table is missing.
2. **Agent editing doesn't refresh the list** — fixed with `refreshTrigger` prop pattern, but verify it works after DB recreation.
3. **Bridge-side agent handlers don't exist yet** — `bridge-client.js` has no `agent:start`, `agent:stop`, `agent:chat:*` handlers. The server emits these events but the bridge never processes them. This is the #1 prerequisite for Phase 6e.
4. **`--no-tools` flag doesn't exist** — for command center chat-only mode, use `--tools ""` instead.

---

## Phase 6e — What to Build Next

The full spec is in the plan file: `/Users/michaelkraft/.claude/plans/jolly-sauteeing-scone.md` (search for "Phase 6e").

### Three features:

**1. Agent Memory (FTS5 RAG)**
- New table: `agent_hub_memory` + FTS5 virtual table
- Auto-summarize completed runs using Haiku ($0.001/run)
- Before each new run, search memory for relevant context and inject top 5 results
- Fallback: if Haiku API fails, store auto-generated basic summary
- Gate: only summarize if exitCode=0 OR stdout > 500 chars
- Retention: max 100 entries per agent, prune oldest

**2. Context Stack (owner.md + project context)**
- `~/.coder1/owner.md` — global owner profile (brand voice, working style)
- `{workspacePath}/CONTEXT.md` — per-project context
- Injection order: owner.md → project CONTEXT.md → system prompt → supervisor tools → memory recall → task
- Size caps: owner.md max 4KB, CONTEXT.md max 8KB
- New Settings page in Agent Hub for editing owner profile

**3. Command Center (floating chat)**
- Chat panel on agent detail page, routed through bridge
- Uses Claude Code subscription ($0 extra cost), not Anthropic API
- Bridge spawns Claude Code in interactive mode with `--tools ""`
- Socket.IO events: `agent:chat:start`, `agent:chat:input`, `agent:chat:output`, `agent:chat:stop`
- 15-minute idle timeout
- Chat messages stored in `agent_hub_chat_messages` table with `session_id`

### Implementation order (dependencies):
1. Context Stack first (prerequisite for memory and command center)
2. Memory second (needs context stack injection point)
3. Command Center last (needs both + bridge-side handlers)

### Critical prerequisite:
**Bridge-client.js must implement `agent:start`/`agent:stop` handlers** before command center work begins. Check `bridge-cli/src/bridge-client.js` and `bridge-cli/src/claude-executor.js` for existing patterns.

---

## How to Run the Worktree Dev Server

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/.worktrees/agent-hub/coder1-ide-next

# Delete old DB (if schema errors)
rm -f data/agent-hub.db

# Start on port 3003 (doesn't conflict with main IDE on 3001)
PORT=3003 npm run dev

# View at: http://localhost:3003/ide/agent-hub/dashboard
```

**Note:** The worktree symlinks `node_modules` from the parent. If modules are missing:
```bash
ln -s /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/node_modules node_modules
```

---

## Env Vars (in .env.local)

```bash
NEXT_PUBLIC_ENABLE_AGENT_HUB=true     # Feature flag
PORT=3003                              # Worktree dev port
AGENT_HUB_INTERNAL_TOKEN=             # For supervisor delegation + scheduler (generate with: openssl rand -hex 32)
CODER1_SERVER_URL=http://localhost:3003  # Used in supervisor prompts
```

---

## Architecture Quick Reference

```
Browser (Agent Hub UI)
    ↓ HTTP/WebSocket
Next.js Server (server.js, port 3003)
    ├── API Routes (CRUD for agents, tasks, runs, projects, comments)
    ├── Socket.IO (run streaming, future: command center chat)
    ├── SQLite (agent-hub.db via better-sqlite3)
    └── Bridge Manager (routes agent:start to bridge)
            ↓ WebSocket
Bridge CLI (on user's Mac)
    ├── claude-executor.js (spawns Claude Code processes)
    └── PTY management
            ↓
Claude Code CLI (does the actual work in git worktrees)
```

---

## Review Findings to Address

From the Phase 6e plan review (by a sub-agent):
1. FTS5: use self-managed table (no `content=` clause) to avoid trigger complexity
2. Haiku summarization needs fallback when API key missing
3. Size caps on owner.md (4KB) and CONTEXT.md (8KB)
4. CONTEXT.md path: resolve with `path.resolve()`, verify no `../` escape
5. Chat `session_id` column needed for multi-session support
6. Memory retention: max 100 per agent, prune on insert
7. 15-minute idle timeout for command center sessions

---

## To start the next session, tell the new agent:

> "Read `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/.worktrees/agent-hub/coder1-ide-next/docs/AGENT-HUB-HANDOFF.md` for project context, then read the Phase 6e section of `/Users/michaelkraft/.claude/plans/jolly-sauteeing-scone.md` for the implementation plan. We're continuing work on the Agent Hub — implement Phase 6e (Agent Memory, Context Stack, Command Center)."
