# Agent Hub Enhancements

## Enhancement 1: Agent Type Templates
- [x] Create `lib/agent-hub/templates.ts` — template definitions + interface
- [x] Create `components/agent-hub/agents/AgentTemplateSelector.tsx` — template picker grid
- [x] Modify `components/agent-hub/agents/AgentForm.tsx` — integrate template selector into "New Agent" flow

## Enhancement 2: Worktree Merge/Discard UI
- [x] Create `app/api/agent-hub/runs/[id]/worktree/route.ts` — git worktree status + merge/discard API
- [x] Create `components/agent-hub/runs/WorktreeMergePanel.tsx` — diff summary + merge/discard actions
- [x] Modify run detail view — render WorktreeMergePanel when worktreePath exists

## Enhancement 3: Cross-Project Shared Memory
- [x] Modify `lib/agent-hub/db.ts` — add scope + projectId columns via migration
- [x] Modify `lib/agent-hub/memory.ts` — add scope to types, storeMemory, new scoped query functions
- [x] Modify `app/api/agent-hub/agents/[id]/memory/route.ts` — returns all scopes, POST accepts scope, filter by ?scope=
- [x] Create `app/api/agent-hub/memory/route.ts` — global user/project memory CRUD endpoint

Note: UI scope filter tabs deferred — the API layer is complete and the agent memory page already renders memories. Adding ?scope= filter and scope badges to the existing AgentMemorySection component is a small follow-up.

## Review

### Enhancement 1: Agent Type Templates
- Created `lib/agent-hub/templates.ts` with 6 built-in templates (Coder, Reviewer, Debugger, Support, Marketing, Security)
- Created `AgentTemplateSelector.tsx` — 3-column grid that appears above AgentForm for new agents
- Modified `AgentForm.tsx` — imports selector, adds `templateApplied` state, `applyTemplate()` pre-fills all form fields
- Template selector auto-hides when editing existing agents or after selection/skip

### Enhancement 2: Worktree Merge/Discard UI
- Created `/api/agent-hub/runs/[id]/worktree/route.ts` — GET returns diff summary + file list, POST handles merge/discard/keep
- Reuses existing `git-tracker.ts` functions (no new git logic)
- Created `WorktreeMergePanel.tsx` — shows branch name, changed files, diff stats, merge/discard/keep buttons
- Discard requires confirmation click. Merge conflicts return 409 with warning UI.
- Wired into `RunViewer.tsx` — renders between metadata bar and terminal panes when `run.worktreePath` exists

### Enhancement 3: Cross-Project Shared Memory
- Added `scope` (agent/project/user) and `project_id` columns to `agent_hub_memory` via migration in `db.ts`
- Extended `MemoryEntry` type with `scope` and `projectId` fields
- Updated `storeMemory()` to accept scope and projectId params (backward compatible defaults)
- Added `listMemoryForAgent()` — returns agent-scope + project-scope + user-scope memories
- Added `listMemoryByScope()`, `storeScopedMemory()`, `deleteMemory()` helper functions
- Updated `/api/agent-hub/agents/[id]/memory` — GET returns all scopes (filterable via ?scope=), POST accepts scope
- Created `/api/agent-hub/memory` — global endpoint for user/project scoped memories not tied to any agent
