# Agent-Hub: Neural Stream + Human Escalation + Fleet View

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three capabilities to the Coder1 agent-hub: (1) a live "Neural Stream" panel showing agent reasoning in real-time, (2) a human-escalation flow where agents can request input and be unblocked, and (3) a fleet-view grid for comparing all agents at a glance.

**Architecture:**
- Neural Stream: parse Claude Code's `⏺ Tool(args)` output format in `server.js`, emit `run:thought` Socket.IO events, persist in a new DB table, display in a collapsible panel above the terminal in RunViewer.
- Human Escalation: detect `[[HUMAN_INPUT_REQUIRED: reason]]` marker in output chunks, add `needs_human_input` run status, new respond API endpoint, dashboard section.
- Fleet View: third view mode in `AgentList` ('fleet'), new `AgentFleetCard` component, lazy stats loading.

**Tech Stack:** Next.js 14, TypeScript strict, better-sqlite3, Socket.IO, React, Tailwind CSS, Lucide icons

---

## File Map

### Feature 1 — Neural Stream

| Action | Path |
|--------|------|
| Modify | `lib/agent-hub/db.ts` — add `agent_hub_run_thoughts` table + `addColumnIfMissing` calls |
| Create | `lib/agent-hub/thought-parser.ts` — regex-based thought extraction from raw output chunks |
| Modify | `lib/agent-hub/runs.ts` — add `RunThought` type, `appendRunThought()`, `getRunThoughts()` |
| Modify | `server.js` — call parser in `agent:output` handler, emit `run:thought`, persist |
| Modify | `app/api/agent-hub/runs/[id]/route.ts` — include `thoughts` in GET response |
| Create | `components/agent-hub/runs/ThoughtStream.tsx` — collapsible timeline component |
| Modify | `components/agent-hub/runs/RunViewer.tsx` — add ThoughtStream panel above terminal |

### Feature 2 — Human Escalation

| Action | Path |
|--------|------|
| Modify | `lib/agent-hub/db.ts` — `addColumnIfMissing` for `human_input_request`, `human_input_response` |
| Modify | `lib/agent-hub/runs.ts` — extend `Run` type with two new fields + new status |
| Modify | `server.js` — detect `[[HUMAN_INPUT_REQUIRED:...]]` in `agent:output`, update run status |
| Create | `app/api/agent-hub/runs/[id]/respond/route.ts` — POST endpoint to submit human response |
| Modify | `lib/agent-hub/bridge-integration.ts` — inject `humanInputResponse` into prompt when present |
| Create | `components/agent-hub/runs/HumanInputCard.tsx` — escalation display + response form |
| Modify | `components/agent-hub/runs/RunStatusChip.tsx` — add `needs_human_input` status config |
| Modify | `components/agent-hub/runs/RunViewer.tsx` — render HumanInputCard when status is `needs_human_input` |
| Modify | `components/agent-hub/dashboard/AgentHubDashboard.tsx` — add "Needs Your Input" section |
| Modify | `app/api/agent-hub/dashboard/route.ts` — include `humanInputRuns` in dashboard data |
| Modify | `lib/agent-hub/templates.ts` — add human escalation instruction to all agent system prompts |

### Feature 3 — Fleet View

| Action | Path |
|--------|------|
| Create | `components/agent-hub/agents/AgentFleetCard.tsx` — compact agent card with lazy stats |
| Modify | `components/agent-hub/agents/AgentList.tsx` — add 'fleet' view mode + grid layout |

---

## Feature 1: Neural Stream

### Task 1: DB schema for thought events

**Files:**
- Modify: `lib/agent-hub/db.ts`

- [ ] **Step 1: Add thought table creation in `initializeSchema`**

Open `lib/agent-hub/db.ts`. After the `agent_hub_run_log_chunks` table creation block (around line 157), add:

```typescript
  database.exec(`
    CREATE TABLE IF NOT EXISTS agent_hub_run_thoughts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      label TEXT NOT NULL,
      tool TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_run_thoughts_run_id
    ON agent_hub_run_thoughts(run_id)
  `);
```

- [ ] **Step 2: Verify dev server starts without error**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev 2>&1 | head -20
# Expected: "ready - started server" with no SQLite errors
```

- [ ] **Step 3: Commit**

```bash
git add lib/agent-hub/db.ts
git commit -m "feat(agent-hub): add agent_hub_run_thoughts table"
```

---

### Task 2: Thought parser utility

**Files:**
- Create: `lib/agent-hub/thought-parser.ts`

- [ ] **Step 1: Create the parser**

```typescript
// lib/agent-hub/thought-parser.ts

const ANSI_STRIP = /\x1b\[[0-9;]*[mGKHF]/g;

// Claude Code tool call: ⏺ ToolName(args) or ● ToolName(args)
const TOOL_CALL_RE = /^[⏺●◆]\s+(\w+)\(([^)]*(?:\([^)]*\)[^)]*)*)\)/;

// Completion indicator: ✓ or ✔ followed by text
const TOOL_DONE_RE = /^[✓✔✅]\s+(.+)/;

// Milestone: lines starting with known planning/reasoning phrases
const THINKING_RE = /^(?:I (?:need|will|should|can|am|have)|Let me|Now I|Next,|First,|Then,|Finally,|Analyzing|Planning|Thinking|Based on|Looking at|The (?:task|issue|error|problem|file|code))/i;

export interface ThoughtEvent {
  eventType: 'tool_call' | 'tool_result' | 'thinking' | 'milestone';
  label: string;
  tool?: string;
  detail?: string;
}

export function parseThoughtFromChunk(rawChunk: string): ThoughtEvent | null {
  // Process each line — chunks may contain multiple newline-separated lines
  const lines = rawChunk.split('\n');

  for (const line of lines) {
    const clean = line.replace(ANSI_STRIP, '').trim();
    if (!clean || clean.length < 4) continue;

    // Tool call pattern: ⏺ Read(path/to/file.ts)
    const toolMatch = clean.match(TOOL_CALL_RE);
    if (toolMatch) {
      const tool = toolMatch[1];
      const args = toolMatch[2].slice(0, 100);
      return {
        eventType: 'tool_call',
        tool,
        detail: args,
        label: `${tool}(${args})`,
      };
    }

    // Tool result/completion line
    const doneMatch = clean.match(TOOL_DONE_RE);
    if (doneMatch) {
      return {
        eventType: 'tool_result',
        label: doneMatch[1].slice(0, 120),
      };
    }

    // Planning / reasoning text (only lines > 30 chars to avoid noise)
    if (clean.length > 30 && THINKING_RE.test(clean)) {
      return {
        eventType: 'thinking',
        label: clean.slice(0, 150),
      };
    }
  }

  return null;
}
```

- [ ] **Step 2: Manually verify the parser with a quick test**

```bash
node -e "
const { parseThoughtFromChunk } = require('./lib/agent-hub/thought-parser.ts');
// This won't work directly with TS — just verify the file compiles
npx tsc --noEmit 2>&1 | head -20
"
```

If `tsc` passes with no errors, the parser is correct. If it fails, fix type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-hub/thought-parser.ts
git commit -m "feat(agent-hub): add thought parser for Claude Code output"
```

---

### Task 3: RunThought type + DB functions in runs.ts

**Files:**
- Modify: `lib/agent-hub/runs.ts`

- [ ] **Step 1: Add `RunThought` interface and row type after the `RunLogChunk` interface (around line 203)**

```typescript
// Add after RunLogChunk interface and its row type

export interface RunThought {
  id: string;
  runId: string;
  sequence: number;
  eventType: 'tool_call' | 'tool_result' | 'thinking' | 'milestone';
  label: string;
  tool: string | null;
  detail: string | null;
  createdAt: string;
}

interface RunThoughtRow {
  id: string;
  run_id: string;
  sequence: number;
  event_type: string;
  label: string;
  tool: string | null;
  detail: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Add `appendRunThought()` and `getRunThoughts()` functions at the end of `runs.ts`**

```typescript
export function appendRunThought(
  runId: string,
  eventType: RunThought['eventType'],
  label: string,
  tool?: string,
  detail?: string,
): void {
  const db = getAgentHubDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const countRow = db
    .prepare('SELECT COUNT(*) as cnt FROM agent_hub_run_thoughts WHERE run_id = ?')
    .get(runId) as { cnt: number };

  db.prepare(
    `INSERT INTO agent_hub_run_thoughts (id, run_id, sequence, event_type, label, tool, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, runId, countRow.cnt, eventType, label, tool ?? null, detail ?? null, now);
}

export function getRunThoughts(runId: string): RunThought[] {
  const db = getAgentHubDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM agent_hub_run_thoughts WHERE run_id = ? ORDER BY sequence ASC'
    )
    .all(runId) as RunThoughtRow[];
  return rows.map((row) => ({
    id: row.id,
    runId: row.run_id,
    sequence: row.sequence,
    eventType: row.event_type as RunThought['eventType'],
    label: row.label,
    tool: row.tool,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npx tsc --noEmit 2>&1 | grep -i "runs.ts\|thought"
# Expected: no errors
```

- [ ] **Step 4: Commit**

```bash
git add lib/agent-hub/runs.ts
git commit -m "feat(agent-hub): add RunThought type and DB functions"
```

---

### Task 4: Emit thought events in server.js

**Files:**
- Modify: `server.js` (around lines 2390–2410, the `agent:output` handler)

- [ ] **Step 1: Add `parseThoughtFromChunk` call in the `agent:output` handler**

Find this block in `server.js`:
```javascript
socket.on('agent:output', ({ runId, chunk, type }) => {
  const userId = socket.userId;
  if (!userId) {
    console.warn('[agent-hub] agent:output received with no userId on socket, ignoring');
    return;
  }
  io.to(`run:${runId}`).emit(type === 'stderr' ? 'run:stderr' : 'run:stdout', {
    chunk,
    timestamp: new Date().toISOString(),
  });
  setImmediate(() => {
    try {
      const { appendRunLogChunk } = require('./lib/agent-hub/runs');
      const token = process.env.AGENT_HUB_INTERNAL_TOKEN;
      const safeChunk = token ? chunk.replace(...) : chunk;
      appendRunLogChunk(runId, safeChunk, type || 'stdout');
    } catch (e) {
      console.warn('[agent-hub] chunk storage error:', e.message);
    }
  });
});
```

Replace the entire `agent:output` handler with:

```javascript
socket.on('agent:output', ({ runId, chunk, type }) => {
  const userId = socket.userId;
  if (!userId) {
    console.warn('[agent-hub] agent:output received with no userId on socket, ignoring');
    return;
  }

  // Broadcast raw output to run room
  io.to(`run:${runId}`).emit(type === 'stderr' ? 'run:stderr' : 'run:stdout', {
    chunk,
    timestamp: new Date().toISOString(),
  });

  // Parse thought event from stdout only (stderr is noise/errors)
  if (type !== 'stderr') {
    try {
      const { parseThoughtFromChunk } = require('./lib/agent-hub/thought-parser');
      const thought = parseThoughtFromChunk(chunk);
      if (thought) {
        io.to(`run:${runId}`).emit('run:thought', {
          ...thought,
          runId,
          timestamp: new Date().toISOString(),
        });
        // Persist in background
        setImmediate(() => {
          try {
            const { appendRunThought } = require('./lib/agent-hub/runs');
            appendRunThought(runId, thought.eventType, thought.label, thought.tool, thought.detail);
          } catch (e) {
            console.warn('[agent-hub] thought storage error:', e.message);
          }
        });
      }
    } catch (e) {
      console.warn('[agent-hub] thought parsing error:', e.message);
    }
  }

  // Persist raw log chunk (existing behavior)
  setImmediate(() => {
    try {
      const { appendRunLogChunk } = require('./lib/agent-hub/runs');
      const token = process.env.AGENT_HUB_INTERNAL_TOKEN;
      const safeChunk = token ? chunk.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]') : chunk;
      appendRunLogChunk(runId, safeChunk, type || 'stdout');
    } catch (e) {
      console.warn('[agent-hub] chunk storage error:', e.message);
    }
  });
});
```

**Key edge cases handled:**
- `thought-parser.ts` is compiled to JS — `require('./lib/agent-hub/thought-parser')` works because Next.js transpiles. However, since server.js is plain Node.js (not bundled), we need to check if this import works. If `thought-parser.ts` uses ESM or TypeScript-only syntax, it won't work directly.

**Important — server.js uses CommonJS:** The parser must be in `.js` or transpiled. Two options:
  - Option A (preferred): Rename parser to `thought-parser.js` with JSDoc types
  - Option B: Keep `.ts` but server.js must use a bundled/compiled version

Use **Option A** — rewrite `thought-parser.ts` as `thought-parser.js` since server.js is plain Node.js:

- [ ] **Step 2: Move thought-parser to lib/agent-hub/thought-parser.js (CommonJS)**

Delete `lib/agent-hub/thought-parser.ts` and create `lib/agent-hub/thought-parser.js`:

```javascript
// lib/agent-hub/thought-parser.js
'use strict';

const ANSI_STRIP = /\x1b\[[0-9;]*[mGKHF]/g;
const TOOL_CALL_RE = /^[⏺●◆]\s+(\w+)\(([^)]*(?:\([^)]*\)[^)]*)*)\)/;
const TOOL_DONE_RE = /^[✓✔✅]\s+(.+)/;
const THINKING_RE = /^(?:I (?:need|will|should|can|am|have)|Let me|Now I|Next,|First,|Then,|Finally,|Analyzing|Planning|Thinking|Based on|Looking at|The (?:task|issue|error|problem|file|code))/i;

/**
 * @param {string} rawChunk
 * @returns {{ eventType: string, label: string, tool?: string, detail?: string } | null}
 */
function parseThoughtFromChunk(rawChunk) {
  const lines = rawChunk.split('\n');

  for (const line of lines) {
    const clean = line.replace(ANSI_STRIP, '').trim();
    if (!clean || clean.length < 4) continue;

    const toolMatch = clean.match(TOOL_CALL_RE);
    if (toolMatch) {
      const tool = toolMatch[1];
      const args = toolMatch[2].slice(0, 100);
      return { eventType: 'tool_call', tool, detail: args, label: `${tool}(${args})` };
    }

    const doneMatch = clean.match(TOOL_DONE_RE);
    if (doneMatch) {
      return { eventType: 'tool_result', label: doneMatch[1].slice(0, 120) };
    }

    if (clean.length > 30 && THINKING_RE.test(clean)) {
      return { eventType: 'thinking', label: clean.slice(0, 150) };
    }
  }

  return null;
}

module.exports = { parseThoughtFromChunk };
```

Update `lib/agent-hub/thought-parser.ts` to re-export from the JS file for TypeScript consumers:

```typescript
// lib/agent-hub/thought-parser.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require('./thought-parser.js') as {
  parseThoughtFromChunk: (chunk: string) => ThoughtEvent | null;
};

export interface ThoughtEvent {
  eventType: 'tool_call' | 'tool_result' | 'thinking' | 'milestone';
  label: string;
  tool?: string;
  detail?: string;
}

export const parseThoughtFromChunk = mod.parseThoughtFromChunk;
```

- [ ] **Step 3: Verify server.js require works**

```bash
node -e "const { parseThoughtFromChunk } = require('./lib/agent-hub/thought-parser.js'); console.log(parseThoughtFromChunk('⏺ Read(src/index.ts)'));"
# Expected: { eventType: 'tool_call', tool: 'Read', detail: 'src/index.ts', label: 'Read(src/index.ts)' }
```

- [ ] **Step 4: Type-check TypeScript side**

```bash
npx tsc --noEmit 2>&1 | head -20
# Expected: no errors related to thought-parser
```

- [ ] **Step 5: Commit**

```bash
git add server.js lib/agent-hub/thought-parser.js lib/agent-hub/thought-parser.ts
git commit -m "feat(agent-hub): emit run:thought events from agent output stream"
```

---

### Task 5: Expose thoughts in GET /api/agent-hub/runs/[id]

**Files:**
- Modify: `app/api/agent-hub/runs/[id]/route.ts`

- [ ] **Step 1: Read the current route**

```bash
cat app/api/agent-hub/runs/\[id\]/route.ts
```

- [ ] **Step 2: Add `thoughts` to the response**

Find the `GET` handler. It currently returns `{ run, logChunks }`. Add thoughts:

```typescript
import { getRun, getRunLogChunks, getRunThoughts } from '@/lib/agent-hub/runs';

// In the GET handler body, after fetching logChunks:
const thoughts = getRunThoughts(id);

return NextResponse.json({ run, logChunks, thoughts });
```

- [ ] **Step 3: Update `RunDetail` interface in RunViewer.tsx to include thoughts**

In `RunViewer.tsx` line 16, update:
```typescript
import type { Run, RunLogChunk, RunThought } from '@/lib/agent-hub/runs';

interface RunDetail {
  run: Run;
  logChunks: RunLogChunk[];
  thoughts: RunThought[];
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/agent-hub/runs/\[id\]/route.ts components/agent-hub/runs/RunViewer.tsx
git commit -m "feat(agent-hub): include thoughts in run detail API response"
```

---

### Task 6: ThoughtStream component + RunViewer integration

**Files:**
- Create: `components/agent-hub/runs/ThoughtStream.tsx`
- Modify: `components/agent-hub/runs/RunViewer.tsx`

- [ ] **Step 1: Create ThoughtStream component**

```typescript
// components/agent-hub/runs/ThoughtStream.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Wrench, CheckCircle2, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import type { RunThought } from '@/lib/agent-hub/runs';
import { getSocket } from '@/lib/socket';

interface LiveThought {
  id: string;
  eventType: 'tool_call' | 'tool_result' | 'thinking' | 'milestone';
  label: string;
  tool?: string;
  timestamp: string;
}

interface Props {
  runId: string;
  initialThoughts: RunThought[];
  isLive: boolean;
}

const EVENT_CONFIG = {
  tool_call: {
    icon: Wrench,
    color: 'text-coder1-cyan',
    dotColor: 'bg-coder1-cyan',
  },
  tool_result: {
    icon: CheckCircle2,
    color: 'text-green-400',
    dotColor: 'bg-green-400',
  },
  thinking: {
    icon: Brain,
    color: 'text-text-muted',
    dotColor: 'bg-text-muted',
  },
  milestone: {
    icon: CheckCircle2,
    color: 'text-amber-400',
    dotColor: 'bg-amber-400',
  },
} as const;

export function ThoughtStream({ runId, initialThoughts, isLive }: Props): React.ReactElement {
  const [thoughts, setThoughts] = useState<LiveThought[]>(
    initialThoughts.map((t) => ({
      id: t.id,
      eventType: t.eventType,
      label: t.label,
      tool: t.tool ?? undefined,
      timestamp: t.createdAt,
    }))
  );
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new thoughts arrive
  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thoughts, collapsed]);

  // Subscribe to live thought events
  useEffect(() => {
    if (!isLive) return;

    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

    const setup = async () => {
      socket = await getSocket();
      socket.on(
        'run:thought',
        (event: { runId: string; eventType: string; label: string; tool?: string; timestamp: string }) => {
          if (event.runId !== runId) return;
          setThoughts((prev) => [
            ...prev,
            {
              id: `live-${Date.now()}-${Math.random()}`,
              eventType: event.eventType as LiveThought['eventType'],
              label: event.label,
              tool: event.tool,
              timestamp: event.timestamp,
            },
          ]);
        }
      );
    };

    void setup();

    return () => {
      socket?.off('run:thought');
    };
  }, [runId, isLive]);

  const thoughtCount = thoughts.length;

  return (
    <div className="border-b border-border flex flex-col" style={{ maxHeight: collapsed ? '36px' : '200px' }}>
      {/* Header bar */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors shrink-0"
      >
        <span className="flex items-center gap-1.5">
          <Brain size={12} className={isLive && thoughtCount > 0 ? 'text-coder1-cyan animate-pulse' : ''} />
          neural stream
          {thoughtCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-xs">
              {thoughtCount}
            </span>
          )}
        </span>
        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {/* Thought timeline */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1 min-h-0">
          {thoughts.length === 0 ? (
            <p className="text-xs text-text-muted italic py-2">
              {isLive ? 'Waiting for agent activity...' : 'No thought events recorded.'}
            </p>
          ) : (
            thoughts.map((thought) => {
              const config = EVENT_CONFIG[thought.eventType] ?? EVENT_CONFIG.thinking;
              const Icon = config.icon;
              return (
                <div key={thought.id} className="flex items-start gap-2 group">
                  <div className={`mt-0.5 shrink-0 w-3 h-3 flex items-center justify-center`}>
                    <Icon size={11} className={config.color} />
                  </div>
                  <span
                    className={`text-xs leading-tight break-words ${config.color} ${
                      thought.eventType === 'thinking' ? 'italic opacity-70' : ''
                    }`}
                  >
                    {thought.label}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate ThoughtStream into RunViewer.tsx**

In `RunViewer.tsx`:

1. Add import at top:
```typescript
import { ThoughtStream } from './ThoughtStream';
```

2. Add `thoughts` state alongside `detail`:
```typescript
const [detail, setDetail] = useState<RunDetail | null>(null);
```
The `RunDetail` already has `thoughts` from Task 5. No new state needed — read from `detail.thoughts`.

3. In the returned JSX, add `<ThoughtStream>` between the metadata bar and the two-pane body. Replace the two-pane section:

```tsx
{/* Neural stream — shown when run has thoughts or is live */}
<ThoughtStream
  runId={runId}
  initialThoughts={detail?.thoughts ?? []}
  isLive={run?.status === 'running'}
/>

{/* Two-pane body */}
<div className="flex flex-1 min-h-0">
  {/* ... existing terminal + diff panes unchanged ... */}
</div>
```

The `ThoughtStream` goes between the metadata bar (and optional WorktreeMergePanel) and the two-pane body.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i "ThoughtStream\|RunViewer\|thought"
# Expected: no errors
```

- [ ] **Step 4: Visual verification**

Start dev server, navigate to a run in the agent-hub. The "neural stream" panel should appear with a collapsed toggle. When a run is active, tool call events should appear in the panel live.

```
http://localhost:3001/ide/agent-hub/runs  (or navigate to any run detail)
```

- [ ] **Step 5: Commit**

```bash
git add components/agent-hub/runs/ThoughtStream.tsx components/agent-hub/runs/RunViewer.tsx
git commit -m "feat(agent-hub): add neural stream panel to RunViewer"
```

---

## Feature 2: Human Escalation

### Task 7: DB migration + Run type extension

**Files:**
- Modify: `lib/agent-hub/db.ts`
- Modify: `lib/agent-hub/runs.ts`

- [ ] **Step 1: Add migrations in `db.ts`**

In the `runMigrations()` function (where `addColumnIfMissing` calls live, around line 49-55), add:

```typescript
  addColumnIfMissing('agent_hub_runs', 'human_input_request', 'TEXT');
  addColumnIfMissing('agent_hub_runs', 'human_input_response', 'TEXT');
```

- [ ] **Step 2: Extend the `Run` interface in `runs.ts`**

Change:
```typescript
status: 'running' | 'awaiting_approval' | 'approved' | 'rejected' | 'failed' | 'cancelled';
```
To:
```typescript
status: 'running' | 'awaiting_approval' | 'approved' | 'rejected' | 'failed' | 'cancelled' | 'needs_human_input';
```

Add two fields after `errorSummary`:
```typescript
  humanInputRequest: string | null;
  humanInputResponse: string | null;
```

- [ ] **Step 3: Update `RunRow` interface** (the internal DB row type at line ~29):

```typescript
  human_input_request: string | null;
  human_input_response: string | null;
```

- [ ] **Step 4: Update `rowToRun()` mapper** (line ~51):

```typescript
  humanInputRequest: row.human_input_request,
  humanInputResponse: row.human_input_response,
```

- [ ] **Step 5: Update `UpdateRunInput` fieldMap** in `updateRun()` (line ~109):

Add two entries to `fieldMap`:
```typescript
humanInputRequest: 'human_input_request',
humanInputResponse: 'human_input_response',
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i "runs.ts\|human_input\|RunStatus"
# Expected: no errors
```

- [ ] **Step 7: Commit**

```bash
git add lib/agent-hub/db.ts lib/agent-hub/runs.ts
git commit -m "feat(agent-hub): add human_input fields and needs_human_input status to runs"
```

---

### Task 8: Detect escalation marker in server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add `[[HUMAN_INPUT_REQUIRED: ...]]` detection in the `agent:output` handler**

After the thought parsing block (added in Task 4), add this block inside `agent:output`:

```javascript
  // Detect human escalation marker in output
  const humanInputMatch = chunk.match(/\[\[HUMAN_INPUT_REQUIRED:\s*([^\]]+)\]\]/);
  if (humanInputMatch) {
    const request = humanInputMatch[1].trim().slice(0, 500);
    setImmediate(() => {
      try {
        const { updateRun, getRun } = require('./lib/agent-hub/runs');
        updateRun(runId, userId, {
          status: 'needs_human_input',
          humanInputRequest: request,
        });
        io.to(`run:${runId}`).emit('run:human_input_required', { runId, request });
        // Notify via internal API (reuses existing notification pattern)
        const port = process.env.PORT || 3001;
        const internalToken = process.env.AGENT_HUB_INTERNAL_TOKEN || '';
        fetch(`http://localhost:${port}/api/agent-hub/runs/${runId}/notify`, {
          method: 'POST',
          headers: { 'X-Internal-Token': internalToken },
        }).catch(() => {});
      } catch (e) {
        console.warn('[agent-hub] human escalation handler error:', e.message);
      }
    });
  }
```

**This block must be placed inside `socket.on('agent:output', ...)` after the thought parsing block, before the setImmediate for log chunk storage.**

**Edge cases:**
- `request` is truncated to 500 chars to prevent DB bloat
- The notification fetch is non-blocking (`.catch(() => {})`)
- The marker can appear in the middle of a large chunk — `match()` finds first occurrence

- [ ] **Step 2: Add `run:human_input_required` to RunViewer socket cleanup**

In `RunViewer.tsx`, the socket cleanup function (around line 136-143) currently does:
```typescript
socketInstance.off('run:stdout');
socketInstance.off('run:stderr');
socketInstance.off('run:diff');
socketInstance.off('run:complete');
```

Add:
```typescript
socketInstance.off('run:human_input_required');
```

(The listener itself will be added in Task 10.)

- [ ] **Step 3: Verify server starts**

```bash
npm run dev 2>&1 | head -5
```

- [ ] **Step 4: Commit**

```bash
git add server.js components/agent-hub/runs/RunViewer.tsx
git commit -m "feat(agent-hub): detect [[HUMAN_INPUT_REQUIRED]] marker in agent output"
```

---

### Task 9: POST /api/agent-hub/runs/[id]/respond route

**Files:**
- Create: `app/api/agent-hub/runs/[id]/respond/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/agent-hub/runs/[id]/respond/route.ts
import { NextResponse } from 'next/server';
import { getRun, updateRun } from '@/lib/agent-hub/runs';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  let body: { response?: string };
  try {
    body = (await req.json()) as { response?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { response } = body;
  if (!response || typeof response !== 'string' || response.trim().length === 0) {
    return NextResponse.json({ error: 'response is required' }, { status: 400 });
  }

  // Use 'default' userId — matches the relaxed check in getRun
  const run = getRun(id, 'default');
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  if (run.status !== 'needs_human_input') {
    return NextResponse.json(
      { error: `Run is in '${run.status}' status, not 'needs_human_input'` },
      { status: 409 }
    );
  }

  const updated = updateRun(id, run.userId, {
    humanInputResponse: response.trim().slice(0, 2000),
    status: 'cancelled', // Mark as done; user re-runs the task with context injected
  });

  return NextResponse.json({ run: updated });
}
```

**Status note:** When the user provides input, the run status moves to `'cancelled'` (existing terminal state). The human response is stored and will be injected into the next run's context (Task 10). This avoids adding a new `human_input_provided` status that would ripple through every status display.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i "respond"
# Expected: no errors
```

- [ ] **Step 3: Test endpoint manually**

Start dev server, then:
```bash
# First create a run that is in needs_human_input state (via DB or test)
# Then:
curl -X POST http://localhost:3001/api/agent-hub/runs/FAKE_ID/respond \
  -H "Content-Type: application/json" \
  -d '{"response": "test"}'
# Expected: { error: "Run not found" } (404) — proves the route is live
```

- [ ] **Step 4: Commit**

```bash
git add app/api/agent-hub/runs/\[id\]/respond/route.ts
git commit -m "feat(agent-hub): add POST /runs/[id]/respond endpoint for human escalation"
```

---

### Task 10: Inject human response into next run's prompt

**Files:**
- Modify: `lib/agent-hub/bridge-integration.ts`
- Modify: `lib/agent-hub/runs.ts` (add a helper to find the last human response for a task)

- [ ] **Step 1: Add `getLastHumanInputResponse` to runs.ts**

At the end of `runs.ts`:

```typescript
/**
 * Returns the human input response from the most recent cancelled run for a task
 * that had needs_human_input status. Used to inject context into the next run.
 */
export function getLastHumanInputResponse(taskId: string, userId: string): string | null {
  const db = getAgentHubDatabase();
  const row = db
    .prepare(
      `SELECT human_input_response FROM agent_hub_runs
       WHERE task_id = ? AND user_id = ? AND human_input_response IS NOT NULL
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(taskId, userId) as { human_input_response: string | null } | undefined;
  return row?.human_input_response ?? null;
}
```

- [ ] **Step 2: Inject human input response in `buildInjectedPrompt`**

In `lib/agent-hub/bridge-integration.ts`, update `buildInjectedPrompt`:

Find the existing memory section block:
```typescript
async function buildInjectedPrompt(ctx: AgentRunContext): Promise<string> {
  const { buildContextStack } = await import('./context-stack');

  let memorySection: string | null = null;
  try {
    // ... existing memory recall code ...
  } catch {
    // Memory module may not be available yet — skip silently
  }

  return buildContextStack({
    systemPrompt: ctx.systemPrompt,
    skills: ctx.skills,
    taskTitle: ctx.taskTitle,
    taskDescription: ctx.taskDescription,
    runId: ctx.runId,
    workspacePath: ctx.workspacePath,
    supervisorSection: null,
    memorySection,
  });
}
```

Add the human input injection after the memory block, before `buildContextStack`:

```typescript
  // Inject human input response if this task was previously escalated
  let humanInputSection: string | null = null;
  try {
    const { getLastHumanInputResponse } = await import('./runs');
    const response = getLastHumanInputResponse(ctx.taskId, ctx.userId);
    if (response) {
      humanInputSection =
        '## Human Input (Provided in Response to Your Earlier Request)\n\n' + response;
    }
  } catch {
    // Non-critical — skip if unavailable
  }
```

Then update the `buildContextStack` call to include it:
```typescript
  return buildContextStack({
    systemPrompt: ctx.systemPrompt,
    skills: ctx.skills,
    taskTitle: ctx.taskTitle,
    taskDescription: ctx.taskDescription,
    runId: ctx.runId,
    workspacePath: ctx.workspacePath,
    supervisorSection: null,
    memorySection: [memorySection, humanInputSection].filter(Boolean).join('\n\n---\n\n') || null,
  });
```

**Edge case:** If `buildContextStack` doesn't accept null for memorySection, check its signature. If it only accepts `string | null`, the `.filter(Boolean).join(...)` ensures either a combined string or null.

- [ ] **Step 3: Add escalation instructions to agent system prompt templates**

In `lib/agent-hub/templates.ts`, find the base system prompt text used in templates. Add to each template's `systemPrompt` (or a shared base constant if one exists):

```
If you reach a point where you cannot proceed without input from the user (e.g., a missing credential, an ambiguous requirement, or a decision only the user can make), output exactly:
[[HUMAN_INPUT_REQUIRED: <clear description of what you need>]]
Then stop. Do not invent values or make assumptions — wait for the human response.
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i "bridge-integration\|humanInput\|context-stack"
# Expected: no errors
```

- [ ] **Step 5: Commit**

```bash
git add lib/agent-hub/runs.ts lib/agent-hub/bridge-integration.ts lib/agent-hub/templates.ts
git commit -m "feat(agent-hub): inject human input response into subsequent agent run context"
```

---

### Task 11: HumanInputCard component

**Files:**
- Create: `components/agent-hub/runs/HumanInputCard.tsx`
- Modify: `components/agent-hub/runs/RunStatusChip.tsx`
- Modify: `components/agent-hub/runs/RunViewer.tsx`

- [ ] **Step 1: Create HumanInputCard**

```typescript
// components/agent-hub/runs/HumanInputCard.tsx
'use client';

import React, { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';

interface Props {
  runId: string;
  request: string;
  agentName?: string;
  taskTitle?: string;
  onResponded: () => void;
}

export function HumanInputCard({ runId, request, agentName, taskTitle, onResponded }: Props): React.ReactElement {
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/agent-hub/runs/${runId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response.trim() }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      onResponded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-amber-500/40 rounded-lg bg-amber-500/5 p-4 mx-4 my-3">
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-400">Agent Needs Your Input</p>
          {(agentName || taskTitle) && (
            <p className="text-xs text-text-muted mt-0.5">
              {agentName && <span className="font-medium">{agentName}</span>}
              {agentName && taskTitle && <span> · </span>}
              {taskTitle && <span>{taskTitle}</span>}
            </p>
          )}
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">{request}</p>

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your response here..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-bg-tertiary border border-border-default rounded-md text-text-secondary placeholder-text-muted resize-none focus:outline-none focus:border-amber-500/60"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !response.trim()}
              className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium border border-amber-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={12} />
              {submitting ? 'Submitting...' : 'Submit Response'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `needs_human_input` to RunStatusChip**

In `RunStatusChip.tsx`, add to `STATUS_CONFIG`:

```typescript
  needs_human_input: {
    label: 'Needs Your Input',
    classes: 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse',
  },
```

Also update the `Props` interface — since `Run['status']` now includes `needs_human_input`, the TypeScript union will automatically include it. No separate change needed if the component uses `Run['status']` directly.

- [ ] **Step 3: Integrate HumanInputCard into RunViewer**

In `RunViewer.tsx`:

1. Add import:
```typescript
import { HumanInputCard } from './HumanInputCard';
```

2. Add socket listener for `run:human_input_required` in the Socket.IO `useEffect` (alongside the `run:complete` listener):
```typescript
socketInstance.on('run:human_input_required', () => {
  void fetchDetail(); // Refresh run data to show updated status
});
```

3. Add `HumanInputCard` in the JSX, between the metadata bar and the ThoughtStream. It should show when `run.status === 'needs_human_input'`:

```tsx
{/* Human input request — shown when agent is blocked */}
{run?.status === 'needs_human_input' && run.humanInputRequest && (
  <HumanInputCard
    runId={runId}
    request={run.humanInputRequest}
    onResponded={() => void fetchDetail()}
  />
)}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i "HumanInput\|RunViewer\|RunStatus"
# Expected: no errors
```

- [ ] **Step 5: Commit**

```bash
git add components/agent-hub/runs/HumanInputCard.tsx \
        components/agent-hub/runs/RunStatusChip.tsx \
        components/agent-hub/runs/RunViewer.tsx
git commit -m "feat(agent-hub): add HumanInputCard component and integrate into RunViewer"
```

---

### Task 12: Dashboard "Needs Your Input" section

**Files:**
- Modify: `app/api/agent-hub/dashboard/route.ts`
- Modify: `components/agent-hub/dashboard/AgentHubDashboard.tsx`

- [ ] **Step 1: Add `humanInputRuns` to dashboard API**

Read `app/api/agent-hub/dashboard/route.ts` to find where `pendingApprovals` is computed. Add a similar query for `needs_human_input` runs.

Find the SQL that fetches pending approvals (something like `WHERE status = 'awaiting_approval'`). Add alongside it:

```typescript
const humanInputRuns = db.prepare(`
  SELECT r.id, r.human_input_request, r.started_at,
         a.name as agent_name, t.title as task_title
  FROM agent_hub_runs r
  LEFT JOIN agent_hub_agents a ON r.agent_id = a.id
  LEFT JOIN agent_hub_tasks t ON r.task_id = t.id
  WHERE r.status = 'needs_human_input'
  ORDER BY r.started_at DESC
  LIMIT 10
`).all() as Array<{
  id: string;
  human_input_request: string | null;
  started_at: string;
  agent_name: string | null;
  task_title: string | null;
}>;
```

Include `humanInputRuns` in the response JSON.

- [ ] **Step 2: Add `HumanInputRun` type and state to AgentHubDashboard**

In `AgentHubDashboard.tsx`, add after the `StuckAgent` interface:

```typescript
interface HumanInputRun {
  id: string;
  humanInputRequest: string | null;
  startedAt: string;
  agentName: string | null;
  taskTitle: string | null;
}
```

Add state:
```typescript
const [humanInputRuns, setHumanInputRuns] = useState<HumanInputRun[]>([]);
```

In `fetchDashboard()`, map the response data:
```typescript
setHumanInputRuns(
  (data.humanInputRuns ?? []).map((r: { id: string; human_input_request: string | null; started_at: string; agent_name: string | null; task_title: string | null }) => ({
    id: r.id,
    humanInputRequest: r.human_input_request,
    startedAt: r.started_at,
    agentName: r.agent_name,
    taskTitle: r.task_title,
  }))
);
```

- [ ] **Step 3: Render "Needs Your Input" section in the dashboard JSX**

Add this section before the Pending Approvals or Stuck Agents section. Find a suitable spot in the return JSX (look for the section showing `stuckAgents` or `recentRuns`):

```tsx
{/* Needs Your Input */}
{humanInputRuns.length > 0 && (
  <div className="bg-bg-secondary border border-amber-500/30 rounded-lg p-4">
    <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
      <AlertTriangle size={12} />
      Needs Your Input ({humanInputRuns.length})
    </h3>
    <ul className="space-y-3">
      {humanInputRuns.map((run) => (
        <li key={run.id} className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-secondary">
              {run.agentName ?? 'Unknown'}{run.taskTitle ? ` · ${run.taskTitle}` : ''}
            </p>
            <p className="text-xs text-text-muted mt-0.5 truncate">
              {run.humanInputRequest ?? 'Agent is waiting for input'}
            </p>
          </div>
          <a
            href={`/ide/agent-hub/runs/${run.id}`}
            className="shrink-0 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            Respond
          </a>
        </li>
      ))}
    </ul>
  </div>
)}
```

Add `AlertTriangle` to the import line at the top of AgentHubDashboard.tsx (it likely already imports from lucide-react — check and add if missing).

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i "Dashboard\|humanInput"
# Expected: no errors
```

- [ ] **Step 5: Visual verification**

Navigate to `http://localhost:3001/ide/agent-hub` — the dashboard should load without errors. The "Needs Your Input" section only appears when there are escalated runs.

- [ ] **Step 6: Commit**

```bash
git add app/api/agent-hub/dashboard/route.ts \
        components/agent-hub/dashboard/AgentHubDashboard.tsx
git commit -m "feat(agent-hub): add Needs Your Input section to dashboard"
```

---

## Feature 3: Fleet View

### Task 13: AgentFleetCard component

**Files:**
- Create: `components/agent-hub/agents/AgentFleetCard.tsx`

- [ ] **Step 1: Create AgentFleetCard**

```typescript
// components/agent-hub/agents/AgentFleetCard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import AgentStatusChip from './AgentStatusChip';
import type { Agent } from '@/lib/agent-hub/agents';

interface AgentStats {
  successRate: { total: number; succeeded: number };
  totalSpentCents: number;
  latestRun: { status: string; cost_cents: number; error_summary: string | null } | null;
  stuckRun: { runId: string } | null;
}

interface Props {
  agent: Agent;
  selected: boolean;
  onSelect: (id: string) => void;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function successRatePct(stats: AgentStats): string {
  if (stats.successRate.total === 0) return '—';
  return `${Math.round((stats.successRate.succeeded / stats.successRate.total) * 100)}%`;
}

const STATUS_BORDER: Record<Agent['status'], string> = {
  running: 'border-coder1-cyan/50',
  idle: 'border-border-default',
  error: 'border-red-500/40',
  archived: 'border-border-default opacity-50',
  paused: 'border-border-default opacity-70',
};

const MODEL_SHORT: Record<string, string> = {
  'claude-haiku-4-5': 'Haiku',
  'claude-sonnet-4-6': 'Sonnet',
  'claude-opus-4-6': 'Opus',
};

export function AgentFleetCard({ agent, selected, onSelect }: Props): React.ReactElement {
  const [stats, setStats] = useState<AgentStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agent-hub/agents/${agent.id}/stats`)
      .then((r) => r.json())
      .then((data: AgentStats) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {}); // Silent — stats are non-critical
    return () => { cancelled = true; };
  }, [agent.id]);

  const borderClass = STATUS_BORDER[agent.status] ?? 'border-border-default';
  const isStuck = agent.status === 'running' && agent.lastRunAt &&
    Date.now() - new Date(agent.lastRunAt).getTime() > 10 * 60 * 1000;

  return (
    <button
      onClick={() => onSelect(agent.id)}
      className={`
        w-full text-left rounded-lg border bg-bg-secondary p-3 transition-all
        hover:bg-bg-tertiary hover:border-coder1-cyan/30
        ${borderClass}
        ${selected ? 'ring-1 ring-coder1-cyan/60 border-coder1-cyan/50' : ''}
      `}
    >
      {/* Avatar + name row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Initials avatar */}
          <div className="w-7 h-7 rounded-full bg-coder1-cyan/20 border border-coder1-cyan/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-coder1-cyan">
              {agent.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-secondary truncate">{agent.name}</p>
            <p className="text-xs text-text-muted truncate">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isStuck && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="May be stuck" />
          )}
          <AgentStatusChip status={agent.status} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
        <div>
          <p className="text-xs text-text-muted">Model</p>
          <p className="text-xs text-text-secondary font-medium">
            {MODEL_SHORT[agent.model] ?? agent.model}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Last active</p>
          <p className="text-xs text-text-secondary">{relativeTime(agent.lastRunAt)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Success rate</p>
          <p className="text-xs text-text-secondary font-medium">
            {stats ? successRatePct(stats) : '…'}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Month spend</p>
          <p className="text-xs text-text-secondary font-medium">
            {stats ? `$${(stats.totalSpentCents / 100).toFixed(2)}` : '…'}
          </p>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i "FleetCard"
# Expected: no errors
```

- [ ] **Step 3: Commit**

```bash
git add components/agent-hub/agents/AgentFleetCard.tsx
git commit -m "feat(agent-hub): add AgentFleetCard component for fleet view"
```

---

### Task 14: Fleet view mode in AgentList

**Files:**
- Modify: `components/agent-hub/agents/AgentList.tsx`

- [ ] **Step 1: Add the 'fleet' view mode**

In `AgentList.tsx`:

1. Change the `viewMode` type (line ~34):
```typescript
const [viewMode, setViewMode] = useState<'list' | 'hierarchy' | 'fleet'>('list');
```

2. Add `LayoutGrid` to the import from lucide-react (line 4):
```typescript
import { Plus, List, GitBranch, LayoutGrid } from 'lucide-react';
```

3. Add `AgentFleetCard` import below other imports:
```typescript
import { AgentFleetCard } from './AgentFleetCard';
```

4. Add a third button to the view mode toggle (after the `hierarchy` button, inside the `bg-bg-tertiary` container):
```tsx
<button
  onClick={() => setViewMode('fleet')}
  className={`p-1 rounded transition-colors ${
    viewMode === 'fleet' ? 'bg-bg-secondary text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'
  }`}
  title="Fleet view"
>
  <LayoutGrid size={12} />
</button>
```

5. Add fleet rendering in the list body. The current structure is:
```tsx
) : viewMode === 'list' ? (
  <ul className="divide-y divide-border-default">...</ul>
) : (
  <AgentHierarchy ... />
)}
```

Change to:
```tsx
) : viewMode === 'list' ? (
  <ul className="divide-y divide-border-default">
    {/* existing list items */}
  </ul>
) : viewMode === 'fleet' ? (
  <div className="p-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
    {agents.map((agent) => (
      <AgentFleetCard
        key={agent.id}
        agent={agent}
        selected={selectedAgentId === agent.id}
        onSelect={onAgentSelect}
      />
    ))}
  </div>
) : (
  <AgentHierarchy
    agents={agents}
    selectedAgentId={selectedAgentId}
    onAgentSelect={onAgentSelect}
  />
)}
```

**Layout note:** The fleet grid uses `grid-cols-2` at small breakpoints. The agents list panel is typically ~300px wide in the IDE split layout. `grid-cols-2` at 300px gives ~140px per card which is workable. If the panel is narrower, `grid-cols-1` is the fallback.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i "AgentList\|FleetCard"
# Expected: no errors
```

- [ ] **Step 3: Visual verification**

Navigate to `http://localhost:3001/ide/agent-hub/agents`. Click the new LayoutGrid icon. Agents should render as cards in a grid. Each card shows initials, name, role, status chip, and stats (loading async).

- [ ] **Step 4: Commit**

```bash
git add components/agent-hub/agents/AgentList.tsx
git commit -m "feat(agent-hub): add fleet view mode to agent list"
```

---

## Final Verification

- [ ] **Neural Stream:** Navigate to a running task's run detail page. Verify the "neural stream" panel appears above the terminal. Start a task and observe tool call events appearing in real-time. Collapse/expand the panel with the toggle.

- [ ] **Human Escalation:** Add the escalation instruction to an agent's system prompt manually (or via templates). Run a task. If the agent outputs `[[HUMAN_INPUT_REQUIRED: some reason]]`, the RunViewer should switch to show HumanInputCard. The Dashboard should show a "Needs Your Input" banner. Submitting a response should update the run status and store the response. Running the task again should inject the response into the prompt context.

- [ ] **Fleet View:** Navigate to agents page. Click the grid icon. Verify all agents render as cards. Verify clicking a card opens the AgentDetail panel. Verify stats load asynchronously (showing `…` then real values). Verify the stuck agent pulsing amber dot appears for stuck agents.

- [ ] **Type-check final pass:**

```bash
npx tsc --noEmit
# Expected: 0 errors
```

---

## Edge Cases + Notes

### Neural Stream
- **Parser noise:** The THINKING_RE pattern may emit too many or too few events depending on Claude Code's verbosity. If the stream is too noisy, raise the `clean.length > 30` threshold to `> 60`. If it's too sparse, lower it.
- **Thought-parser.js vs .ts:** Two files exist for the same parser — one for server.js (CommonJS), one for TS consumers. Keep them in sync. If the regex logic changes, update both.
- **ThoughtStream panel height:** Set to `maxHeight: 200px` when expanded. This is a fixed height to prevent the panel dominating the view. If users want more space, they collapse/expand.
- **Historic thoughts:** `getRunThoughts()` fetches all thoughts for a past run. For very long runs (1000+ tool calls), the thought list may be long. The auto-scroll to bottom means old thoughts scroll out of view — acceptable.

### Human Escalation
- **Bridge-side:** The `[[HUMAN_INPUT_REQUIRED:...]]` marker must be output by the agent as plain text to stdout. Claude Code may wrap it in Markdown or ANSI — the regex `\[\[HUMAN_INPUT_REQUIRED:\s*([^\]]+)\]\]` handles embedded text but will miss it if it's inside a code block with backticks. If this is an issue, strip markdown code fences before matching.
- **Agent process is not paused:** The agent continues running after outputting the marker. The server detects the marker and marks the run as `needs_human_input`, but the bridge process may have already continued. This is acceptable — the next run gets the response injected.
- **Status collision:** If an agent outputs the marker and then immediately exits, the `agent:complete` handler will try to update the status too. The `agent:complete` handler updates to `awaiting_approval` or `failed`. Since both handlers run in `setImmediate`, there's a race. The `needs_human_input` status from the marker handler should win if it's detected before `agent:complete`. To guard this, in the `agent:complete` handler, check if `run.status === 'needs_human_input'` and skip the status update if so.

### Fleet View
- **Stats loading:** Each card makes an independent fetch to `/api/agent-hub/agents/[id]/stats`. With 20 agents, this is 20 concurrent requests on mount. This is acceptable for a personal IDE. If performance is a concern, a batch stats endpoint can be added later.
- **Grid columns:** `grid-cols-1 sm:grid-cols-2` — the agents panel in the IDE layout is relatively narrow. Don't go wider than 2 columns or cards become too cramped.
