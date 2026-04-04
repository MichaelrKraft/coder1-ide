# Project Detail View - Todo

## Plan

Add a clickable project detail view to the Agent Hub projects page.

### Tasks

- [ ] 1. Create API endpoint `app/api/agent-hub/projects/[id]/stats/route.ts`
  - GET returns agents, tasks, totalRuns, totalCostCents for a project
  - Uses `getAgentHubDatabase` and `getAuthenticatedUserId`
  - Queries agents/tasks/runs tables by project_id

- [ ] 2. Update `app/ide/agent-hub/projects/page.tsx`
  - Add list+detail layout (220px narrow list + detail panel)
  - When no project selected: full-width list (current view)
  - When project selected: narrow list + detail panel
  - Detail panel shows: project info, stats, agents list, tasks list
  - Project rows in narrow list: color dot + name only
  - Sections separated by labels, scrollable detail panel

## Review

_(to be filled after implementation)_
