# Goal-Driven Tasks: Completion Plan

## Current State Summary

### ✅ Fully Working (No Changes Needed)
| Component | Location | Status |
|-----------|----------|--------|
| Task API | `app/api/johnny5/tasks/route.ts` | GET/POST endpoints functional |
| Task Tracker | `services/johnny5/task-tracker.ts` | CRUD + SQLite persistence |
| Mission Control UI | `components/johnny5/mission-control/` | 6-column Kanban board |
| Background Executor | `services/johnny5/background-executor.ts` | Polls + executes tasks |
| Task Router | `services/johnny5/task-router.ts` | Routes to handlers |

### 🟡 Needs Completion
| Component | Location | Issue |
|-----------|----------|-------|
| Opportunity Engine | `services/johnny5/opportunity-engine.ts` | `research` and `build` action handlers are stubs |
| Database Schema | `lib/johnny5-db.ts` | Missing `inbox`/`blocked` status, crew fields |

### ❌ Delete or Ignore
| Component | Reason |
|-----------|--------|
| Proactive Builder | Never existed - was aspirational. BridgeManager handles builds. |
| Code Generator | Never existed - TaskRouter already dispatches to handlers. |

---

## Phase 1: Database Schema Update (30 min)

### 1.1 Add Missing Statuses
The UI expects `inbox`, `blocked`, `review` but DB only has `pending`, `in_progress`, `completed`, `failed`, `cancelled`.

**File:** `lib/johnny5-db.ts`

Add migration:
```sql
-- Expand status options
ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
ALTER TABLE tasks ADD COLUMN block_reason TEXT;
```

Update `task-tracker.ts` status mapping to support all 7 UI statuses.

### 1.2 Verify UI/API Compatibility
- Test that Mission Control correctly shows tasks in each column
- Verify task status transitions work

---

## Phase 2: Opportunity Engine Action Handlers (2 hours)

### 2.1 Research Action Handler
**File:** `services/johnny5/opportunity-engine.ts` (~line 600)

Currently stubbed:
```typescript
case 'research':
  // TODO: Wire up when trend-monitor is replaced
  break;
```

Implement:
```typescript
case 'research': {
  const researchTask = await TaskTracker.createTask({
    title: `Research: ${action.data.topic}`,
    description: action.data.description,
    type: 'research',
    priority: 'medium',
    triggeredBy: 'opportunity',
  });

  // Execute via Gemini Flash with Google Search grounding
  const result = await executeResearchTask(researchTask.id);
  return { success: true, taskId: researchTask.id, result };
}
```

### 2.2 Build Action Handler
**File:** Same location

Implement:
```typescript
case 'build': {
  const buildTask = await TaskTracker.createTask({
    title: `Build: ${action.data.feature}`,
    description: action.data.description,
    type: 'build',
    priority: 'high',
    triggeredBy: 'opportunity',
  });

  // Check if Bridge is connected
  const bridgeStatus = await BridgeManager.getStatus();
  if (!bridgeStatus.connected) {
    await TaskTracker.updateTaskStatus(buildTask.id, 'blocked', {
      blockReason: 'Bridge not connected',
    });
    return { success: false, taskId: buildTask.id, blocked: true };
  }

  // Execute via Bridge
  const result = await BridgeManager.executeTask(buildTask);
  return { success: true, taskId: buildTask.id, result };
}
```

---

## Phase 3: Task Type Handlers (1.5 hours)

### 3.1 Research Task Handler
**File:** Create `services/johnny5/task-handlers/research-handler.ts`

```typescript
export async function executeResearchTask(taskId: string) {
  const task = await TaskTracker.getTaskById(taskId);
  await TaskTracker.updateTaskStatus(taskId, 'in_progress');

  try {
    // Use Gemini 2.5 Flash with Google Search grounding
    const result = await callGeminiWithSearch({
      prompt: `Research: ${task.title}\n\n${task.description}`,
      systemPrompt: 'You are a research assistant. Provide comprehensive, accurate findings.',
    });

    await TaskTracker.updateTaskStatus(taskId, 'completed', {
      result: { summary: result.text, sources: result.sources },
    });

    return result;
  } catch (error) {
    await TaskTracker.updateTaskStatus(taskId, 'failed', {
      lastError: error.message,
    });
    throw error;
  }
}
```

### 3.2 Build Task Handler
**File:** Create `services/johnny5/task-handlers/build-handler.ts`

```typescript
export async function executeBuildTask(taskId: string) {
  const task = await TaskTracker.getTaskById(taskId);
  await TaskTracker.updateTaskStatus(taskId, 'in_progress');

  try {
    // Use Bridge to execute via Claude CLI
    const result = await BridgeManager.sendMessage({
      type: 'execute-task',
      task: {
        title: task.title,
        description: task.description,
        type: 'build',
      },
    });

    // Move to review after completion
    await TaskTracker.updateTaskStatus(taskId, 'review', {
      result: result,
    });

    return result;
  } catch (error) {
    await TaskTracker.updateTaskStatus(taskId, 'failed', {
      lastError: error.message,
    });
    throw error;
  }
}
```

---

## Phase 4: Connect Task Creation to Johnny5 Chat (1 hour)

### 4.1 Conversation-to-Task Detection
When Johnny5 identifies a task from conversation, create it properly:

**File:** `app/api/johnny5/chat/route.ts`

Add at conversation completion:
```typescript
// Check if Claude identified a follow-up task
if (response.includes('TASK:')) {
  const taskMatch = response.match(/TASK:\s*(.+)/);
  if (taskMatch) {
    await TaskTracker.createTaskFromConversation({
      title: taskMatch[1],
      triggeredBy: 'conversation',
      userId: session.userId,
    });
  }
}
```

---

## Phase 5: Update Playground (15 min)

Update `/private/tmp/johnny5-playground.html`:

1. **Goal-Driven Tasks**: Change from `partial` to `real`
2. **Proactive Builder**: Either delete the node entirely, or change to `dead` with note "Never built - BridgeManager handles builds"
3. **Code Generator**: Delete or mark as `dead` with note "Not needed - TaskRouter handles dispatch"

---

## Verification Checklist

- [ ] Create a task via API: `POST /api/johnny5/tasks`
- [ ] Verify task appears in Mission Control Kanban
- [ ] Trigger Opportunity Engine to create a task
- [ ] Verify research task executes via Gemini
- [ ] Verify build task executes via Bridge (when connected)
- [ ] Test status transitions: queued → in_progress → review → completed
- [ ] Test blocked status when Bridge unavailable

---

## Dependencies

```
Phase 1 (DB) ──┐
               ├──→ Phase 2 (Opportunity Engine)
Phase 3 (Handlers) ←┘
               │
               ├──→ Phase 4 (Chat Integration)
               │
               └──→ Phase 5 (Playground Update)
```

---

## Estimated Time

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Database | 30 min | P0 |
| Phase 2: Opportunity Engine | 2 hours | P0 |
| Phase 3: Task Handlers | 1.5 hours | P1 |
| Phase 4: Chat Integration | 1 hour | P2 |
| Phase 5: Playground Update | 15 min | P2 |

**Total:** ~5-6 hours

---

## Quick Win Alternative

If you want faster results, skip Phases 1-3 and just:

1. **Manual task creation**: POST to `/api/johnny5/tasks` to create tasks
2. **Background Executor already works**: Tasks will execute via existing TaskRouter
3. **UI already works**: Mission Control will display tasks

The system is functional today - it just lacks automatic task generation from Opportunity Engine.
