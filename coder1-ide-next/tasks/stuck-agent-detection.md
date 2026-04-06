# Stuck Agent Detection

## Plan

- [x] 1. Add stuck run detection query to stats API (`app/api/agent-hub/agents/[id]/stats/route.ts`)
- [x] 2. Add `stuckRun` to AgentStats interface and warning banner in AgentDetail (`components/agent-hub/agents/AgentDetail.tsx`)
- [x] 3. Add stuck indicator (amber pulsing dot) to AgentList (`components/agent-hub/agents/AgentList.tsx`)
- [x] 4. Add stuckAgents query to dashboard API (`app/api/agent-hub/dashboard/route.ts`)
- [x] 5. Add stuck agents alert section to dashboard component (`components/agent-hub/dashboard/AgentHubDashboard.tsx`)

## Review

All 5 items completed:
- Stats API now queries for active runs with no log activity for 10+ minutes
- AgentDetail shows amber warning banner when stuck run detected
- AgentList shows amber pulsing dot next to potentially stuck running agents
- Dashboard API queries for all stuck agents across the system
- Dashboard component shows a prominent amber alert section at the top when agents are stuck
