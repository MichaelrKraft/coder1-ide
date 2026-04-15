# Morning Brief on Steroids

## Sprint 1: Foundation
- [x] HTML render script (`scripts/morning-brief/render.js`) — pure Node.js, no npm packages
- [x] EJS-style reference template (`~/.claude/skills/morning-brief-steroids/template.html`)
- [x] Master SKILL.md orchestrator
- [x] Config JSON (15 YouTubers, 11 competitors, 11 newsletters)
- [x] CLI command (`~/.claude/commands/morning-brief.md`)
- [x] Next.js API route (`app/api/morning-brief/goals/route.ts`)
- [x] Public output directory (`public/morning-briefs/` — already has files)
- [x] Update scheduled_tasks.json (6:30 AM + 8:00 AM crons)
- [x] Deprecate old morning-brief-service.ts and generator

## Sprint 2: Data Collectors (embedded in SKILL.md)
- [x] Weather collector (wttr.in) — SKILL.md §1A
- [x] Ambient/parked ideas/overnight collectors — SKILL.md §1B
- [x] AI news collector (web search) — SKILL.md §1E
- [x] Newsletter collector (Gmail MCP) — SKILL.md §1F
- [x] Competitor collector (disambiguated search) — SKILL.md §1G
- [x] YouTube collector (15 channels + watch history) — SKILL.md §1H
- [x] Today's Signal computation — SKILL.md Phase 2

## Sprint 3: Polish
- [ ] Test full pipeline manually (run /morning-brief-steroids with live data)
- [ ] Verify goals form saves to Obsidian (POST to localhost:3001/api/morning-brief/goals)
- [ ] Verify archive page generates (check public/morning-briefs/index.html updates)
- [ ] Verify CLI command works (/morning-brief reads cached JSON)

## Review

### Sprint 1 + 2 Complete — System Built

**Files created:**
- `scripts/morning-brief/render.js` — Pure Node.js renderer (template literals, no deps). Reads brief-data JSON → generates HTML with all 7 zones + updates archive index.
- `~/.claude/skills/morning-brief-steroids/SKILL.md` — 309-line master orchestrator covering all 4 pipeline phases (collect/assemble/render/notify) with detailed instructions per collector.
- `~/.claude/skills/morning-brief-steroids/config.json` — 15 YouTubers, 11 competitors (Coder1 + VidDocs), 30 inspiration quotes, newsletter senders for poolkraftllc@gmail.com.
- `~/.claude/skills/morning-brief-steroids/template.html` — Static reference page with sample data for visual design verification.
- `~/.claude/commands/morning-brief.md` — CLI command that reads cached JSON and prints terminal-formatted summary (no re-collection).
- `app/api/morning-brief/goals/route.ts` — GET reads today's goals from Obsidian daily note; POST writes goals back. Handles file creation if daily note doesn't exist.
- `.claude/scheduled_tasks.json` — Added 6:30 AM MDT cron (collect) and 8:00 AM MDT cron (Telegram notify).

**Files deprecated:**
- `services/johnny5/morning-brief-service.ts` — @deprecated notice added
- `services/johnny5/morning-brief-generator.ts` — @deprecated notice added

**Verified working:**
- `render.js` syntax check passes
- `render.js sample` generates `public/morning-briefs/sample.html` and updates `index.html`
- Full-page screenshot confirms all 7 zones render: Command Center (with weather/streak/quick-dock), Today's Signal, Overnight Debrief, Today's Focus (interactive goals form), Intelligence Feed (tabbed with auto-promoted Competitors tab), YouTube Studio (thumbnails + ideas + watch history), Closing (vault idea + quote + archive link)

**Next step:** Run `/morning-brief-steroids` in a live session to collect real data and do end-to-end verification.

---

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

---

## Fix: Move Agents Button

### Tasks
- [ ] Remove Agents button from PreviewPanel.tsx (right panel)
- [ ] Add Agents Hub button to Terminal.tsx header after AI Team button

### Files
- `components/preview/PreviewPanel.tsx` — remove Agents button (lines 308-316)
- `components/terminal/Terminal.tsx` — add Agents Hub button after AI Team button (~line 5706)

---

## Feature: Teaching Mode for CommandCenter

Add "Teaching Mode" to CommandCenter.tsx — lets users teach agents new workflows step-by-step, then convert the interaction into a reusable skill.

### Tasks
- [ ] Add new lucide icon imports (GraduationCap, BookOpen, Sparkles, Pause, Play, CheckCircle)
- [ ] Add teaching mode state variables (teachingMode, teachingSessionId, teachingComplete, teachingElapsed, teachingPaused, converting)
- [ ] Add teaching session elapsed time tracker useEffect
- [ ] Add teaching session API functions (startTeaching, pauseTeaching, markTeachingDone, convertToSkill)
- [ ] Modify handleSend to include teaching_session_id in chat POST calls
- [ ] Modify onChatOutput assistant save to include teaching_session_id
- [ ] Update header to show "Teaching Mode" status and "Teach" button
- [ ] Add teaching banner (amber bar with timer, pause/resume, done buttons)
- [ ] Add convert-to-skill bar (green bar after teaching complete)
- [ ] Update input placeholder for teaching mode

### File
- `components/agent-hub/agents/CommandCenter.tsx` — all changes in this single file

---

## Feature: AgentHubTour Onboarding Component

Self-contained SVG spotlight overlay tour that highlights Agent Hub UI elements one at a time.

### Tasks
- [x] Create `components/agent-hub/AgentHubTour.tsx` — 7-step tour with SVG mask cutout, tooltip, progress bar
- [x] Verify SSR safety (no window access during render)
- [x] Keep under 200 lines, zero external dependencies (140 lines)

### File
- `components/agent-hub/AgentHubTour.tsx` — single new file

### Review
- Created 140-line self-contained tour component with zero external dependencies
- 7 steps: welcome (centered), sidebar, agents list, command center, teach button, tasks, dashboard stats
- SVG mask cutout overlay at 70% opacity with animated spotlight border and glow
- Tooltip auto-positions below target, flips above if no room, clamps to viewport edges
- `data-tour="target-id"` attribute system — parent components add these to enable highlighting
- SSR-safe: viewport size initialized to 1200x800, updated only in useEffect
- Escape key closes tour; Back/Skip/Next navigation with progress bar
- Accent color (`#8b5cf6`) used for agents-list and teach-button steps; primary (`#00D9FF`) for others
- All styles inline, matches Coder1 dark theme design system
