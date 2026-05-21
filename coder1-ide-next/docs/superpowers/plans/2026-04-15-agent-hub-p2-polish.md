# Agent Hub P2 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bridge health status widget and per-agent cost breakdown to the Agent Hub dashboard.

**Architecture:** Extend existing dashboard API route + add a new bridge-status API route. Both features add UI sections to `AgentHubDashboard.tsx` using the existing stat card pattern.

**Tech Stack:** Next.js 14 app router, TypeScript strict, Tailwind CSS, better-sqlite3 (SQLite), `global.bridgeManager` (set in server.js)

---

## Key Architecture Context

- **Bridge manager**: `global.bridgeManager` (set in server.js). Access via pattern in `lib/agent-hub/bridge-integration.ts:32-35`:
  ```typescript
  function getBridgeManager() {
    const g = global as Record<string, unknown>;
    return (g['bridgeManager'] as BridgeManager) ?? null;
  }
  ```
- **`findAnyConnectedBridge()`** returns `{ id, userId, connectedAt: Date, platform, version } | null`
- **`agent_hub_runs` table** has `cost_cents`, `agent_id`, `started_at`, `status` columns
- **`agent_hub_agents` table** has `id`, `name`, `user_id` columns
- **Dashboard API** is at `app/api/agent-hub/dashboard/route.ts` — returns a single JSON object with `stats`, `recentRuns`, `recentTasks`, `stuckAgents`, `humanInputRuns`
- **Dashboard component** is at `components/agent-hub/dashboard/AgentHubDashboard.tsx` — uses `data-tour="agent-hub-dashboard-stats"` on the stats grid
- **Auth pattern**: All agent-hub API routes call `getAuthenticatedUserId(request)` from `lib/agent-hub/auth.ts` and return 401 if null; in dev this always returns `'default'`
- **DB access pattern**:
  ```typescript
  import { getAgentHubDb } from '@/lib/agent-hub/db';
  const db = getAgentHubDb();
  const rows = db.prepare('SELECT ...').all(...) as SomeType[];
  ```

---

## File Structure

**New files:**
- `app/api/agent-hub/bridge-status/route.ts` — GET endpoint, returns bridge connectivity

**Modified files:**
- `app/api/agent-hub/dashboard/route.ts` — add `costByAgent` array to response
- `components/agent-hub/dashboard/AgentHubDashboard.tsx` — add Bridge Status widget + Cost by Agent section

---

## Task 1: Bridge Status API Endpoint

**Files:**
- Create: `app/api/agent-hub/bridge-status/route.ts`

- [ ] **Step 1: Write the route file**

```typescript
// app/api/agent-hub/bridge-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

interface BridgeInfo {
  id: string;
  userId: string;
  connectedAt: string;
  platform: string;
  version: string;
}

interface BridgeManager {
  findAnyConnectedBridge(): {
    id: string;
    userId: string;
    connectedAt: Date;
    platform: string;
    version: string;
  } | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const g = global as Record<string, unknown>;
  const manager = (g['bridgeManager'] as BridgeManager) ?? null;

  if (!manager) {
    return NextResponse.json({ connected: false, bridge: null });
  }

  const bridge = manager.findAnyConnectedBridge();
  if (!bridge) {
    return NextResponse.json({ connected: false, bridge: null });
  }

  const info: BridgeInfo = {
    id: bridge.id,
    userId: bridge.userId,
    connectedAt: bridge.connectedAt.toISOString(),
    platform: bridge.platform,
    version: bridge.version,
  };

  return NextResponse.json({ connected: true, bridge: info });
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npx tsc --noEmit 2>&1 | grep bridge-status
```
Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add app/api/agent-hub/bridge-status/route.ts
git commit -m "feat(agent-hub): add bridge-status API endpoint"
```

---

## Task 2: Per-Agent Cost Breakdown in Dashboard API

**Files:**
- Modify: `app/api/agent-hub/dashboard/route.ts`

- [ ] **Step 1: Read the current dashboard route**

Read `app/api/agent-hub/dashboard/route.ts` — identify where `monthSpendCents` is calculated and where the response object is assembled.

- [ ] **Step 2: Add `costByAgent` query**

After the existing monthly spend query, add:

```typescript
// Per-agent cost breakdown for current month
interface AgentCostRow {
  agent_id: string;
  agent_name: string;
  total_cents: number;
}

const costByAgent = db.prepare(`
  SELECT r.agent_id, a.name AS agent_name, SUM(r.cost_cents) AS total_cents
  FROM agent_hub_runs r
  JOIN agent_hub_agents a ON r.agent_id = a.id
  WHERE r.user_id = ?
    AND r.started_at >= ?
    AND r.cost_cents > 0
  GROUP BY r.agent_id
  ORDER BY total_cents DESC
  LIMIT 8
`).all(userId, billingStart) as AgentCostRow[];
```

Note: `billingStart` is the start-of-month date already computed for `monthSpendCents`. Use the same variable.

- [ ] **Step 3: Add `costByAgent` to the response**

In the `return NextResponse.json(...)` call, add:
```typescript
costByAgent: costByAgent.map(row => ({
  agentId: row.agent_id,
  agentName: row.agent_name,
  totalCents: row.total_cents,
})),
```

- [ ] **Step 4: Verify type-checks**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npx tsc --noEmit 2>&1 | grep dashboard
```
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add app/api/agent-hub/dashboard/route.ts
git commit -m "feat(agent-hub): add per-agent cost breakdown to dashboard API"
```

---

## Task 3: Bridge Status Widget + Cost Breakdown UI in Dashboard

**Files:**
- Modify: `components/agent-hub/dashboard/AgentHubDashboard.tsx`

- [ ] **Step 1: Read the current dashboard component**

Read `components/agent-hub/dashboard/AgentHubDashboard.tsx` to understand:
- The `DashboardData` interface (what types it uses)
- Where the stats grid is rendered
- How `recentRuns` is displayed (as a pattern for `costByAgent`)

- [ ] **Step 2: Extend `DashboardData` interface**

Add to the interface:
```typescript
costByAgent: Array<{
  agentId: string;
  agentName: string;
  totalCents: number;
}>;
```

- [ ] **Step 3: Add bridge status fetch**

In the component, alongside the dashboard fetch, add a separate `useEffect` that fetches `/api/agent-hub/bridge-status` every 15 seconds:

```typescript
const [bridgeStatus, setBridgeStatus] = useState<{
  connected: boolean;
  bridge: { id: string; platform: string; version: string; connectedAt: string } | null;
} | null>(null);

useEffect(() => {
  const fetchBridgeStatus = async () => {
    try {
      const res = await fetch('/api/agent-hub/bridge-status');
      if (res.ok) setBridgeStatus(await res.json());
    } catch { /* silent */ }
  };
  void fetchBridgeStatus();
  const interval = setInterval(() => void fetchBridgeStatus(), 15_000);
  return () => clearInterval(interval);
}, []);
```

- [ ] **Step 4: Add Bridge Status widget**

Add a bridge status card in the stats grid area. Place it after the existing stat cards. Use inline styles matching the existing dark card pattern (no new CSS classes):

```tsx
{/* Bridge Status widget */}
<div className="bg-bg-secondary border border-border-default rounded-lg p-4">
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Bridge</span>
    <span className={`w-2 h-2 rounded-full ${bridgeStatus?.connected ? 'bg-green-400' : 'bg-red-400'}`} />
  </div>
  {bridgeStatus?.connected && bridgeStatus.bridge ? (
    <>
      <p className="text-sm font-semibold text-text-primary">Connected</p>
      <p className="text-xs text-text-muted mt-1">{bridgeStatus.bridge.platform} v{bridgeStatus.bridge.version}</p>
    </>
  ) : (
    <>
      <p className="text-sm font-semibold text-text-muted">Not Connected</p>
      <p className="text-xs text-text-muted mt-1">Run: coder1-bridge start</p>
    </>
  )}
</div>
```

- [ ] **Step 5: Add Cost by Agent section**

After the existing Recent Activity section (or after Recent Tasks), add:

```tsx
{/* Cost by Agent section */}
{data.costByAgent && data.costByAgent.length > 0 && (
  <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Cost This Month by Agent</h3>
    <div className="space-y-2">
      {data.costByAgent.map(agent => {
        const pct = data.stats.monthSpendCents > 0
          ? Math.round((agent.totalCents / data.stats.monthSpendCents) * 100)
          : 0;
        return (
          <div key={agent.agentId} className="flex items-center gap-2">
            <span className="text-xs text-text-secondary truncate flex-1">{agent.agentName}</span>
            <div className="w-20 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div className="h-full bg-coder1-cyan/60 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-text-muted w-12 text-right">${(agent.totalCents / 100).toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 6: Verify type-checks**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npx tsc --noEmit 2>&1 | grep -E "AgentHubDashboard|bridge-status"
```
Expected: no output

- [ ] **Step 7: Commit**

```bash
git add components/agent-hub/dashboard/AgentHubDashboard.tsx
git commit -m "feat(agent-hub): add bridge status widget and cost-by-agent breakdown to dashboard"
```

---

## Verification

1. Dev server running at `http://localhost:3001`
2. Navigate to `/ide/agent-hub/dashboard`
3. Verify:
   - Bridge status card shows (green if bridge running, red if not)
   - Cost by Agent section shows if any runs with cost exist
   - No TypeScript errors
   - No console errors
