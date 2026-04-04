import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/agent-hub/tasks';
import { getAgent } from '@/lib/agent-hub/agents';
import { createRun, listRunsForAgent } from '@/lib/agent-hub/runs';
import { startAgentRun } from '@/lib/agent-hub/bridge-integration';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: taskId } = await params;

  // 1. Load task
  const task = getTask(taskId, userId);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // 2. Load agent
  const agent = getAgent(task.agentId, userId);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // 3a. Pre-run check: agent not archived
  if (agent.status === 'archived') {
    return NextResponse.json({ error: 'Agent is archived and cannot run tasks' }, { status: 409 });
  }

  // 3b. Pre-run check: concurrent run limit (default maxConcurrentRuns=1)
  if (agent.status === 'running' && agent.maxConcurrentRuns <= 1) {
    return NextResponse.json(
      { error: 'Agent is already running a task. Wait for it to complete first.' },
      { status: 409 }
    );
  }

  // 3c. Pre-run check: monthly budget (scoped to all runs for this agent this month)
  if (agent.monthlyBudgetCents > 0) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString();
    const agentRunsThisMonth = listRunsForAgent(agent.id, userId).filter(
      (r) => r.startedAt >= monthStartISO
    );
    const totalSpentThisMonth = agentRunsThisMonth.reduce((sum, r) => sum + r.costCents, 0);
    if (totalSpentThisMonth >= agent.monthlyBudgetCents) {
      return NextResponse.json(
        { error: 'Monthly budget exhausted for this agent.' },
        { status: 402 }
      );
    }
  }

  // 4. Create run record
  const run = createRun({
    agentId: agent.id,
    taskId: task.id,
    userId,
    model: agent.model,
  });

  // 5. Start via bridge
  const result = await startAgentRun({
    runId: run.id,
    agentId: agent.id,
    taskId: task.id,
    userId,
    workspacePath: agent.workspacePath,
    systemPrompt: agent.systemPrompt,
    skills: agent.skills,
    mcpServers: agent.mcpServers ?? [],
    taskTitle: task.title,
    taskDescription: task.description,
    model: agent.model,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  // 6. Append run ID to task's run history, then update task status
  updateTask(taskId, userId, {
    runIds: [...task.runIds, run.id],
  });
  updateTask(taskId, userId, {
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  });

  return NextResponse.json({ runId: run.id, message: 'Run started' }, { status: 202 });
}
