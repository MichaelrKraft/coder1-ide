import { NextRequest, NextResponse } from 'next/server';
import { createTask } from '@/lib/agent-hub/tasks';
import { getAgent } from '@/lib/agent-hub/agents';
import { createRun } from '@/lib/agent-hub/runs';
import { startAgentRun } from '@/lib/agent-hub/bridge-integration';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth via internal token
  const token = request.headers.get('x-internal-token');
  const expectedToken = process.env.AGENT_HUB_INTERNAL_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'Internal API disabled — AGENT_HUB_INTERNAL_TOKEN not set' },
      { status: 503 }
    );
  }
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, description, agentId, parentTaskId, userId, autoRun } = body as {
    title?: string;
    description?: string;
    agentId?: string;
    parentTaskId?: string;
    userId?: string;
    autoRun?: boolean;
  };

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Verify agent exists
    const agent = getAgent(agentId, userId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Create the task
    const task = createTask({
      userId,
      agentId,
      title: title.trim(),
      description: typeof description === 'string' ? description : undefined,
      parentTaskId: typeof parentTaskId === 'string' ? parentTaskId : undefined,
    });

    let run = null;

    // Auto-run if requested — failure does NOT fail the response
    if (autoRun) {
      try {
        run = createRun({
          agentId: agent.id,
          taskId: task.id,
          userId,
          model: agent.model,
        });

        const result = await startAgentRun({
          runId: run.id,
          agentId: agent.id,
          taskId: task.id,
          userId,
          workspacePath: agent.workspacePath,
          systemPrompt: agent.systemPrompt,
          skills: agent.skills,
          taskTitle: task.title,
          taskDescription: task.description,
          model: agent.model,
        });

        if (!result.success) {
          console.warn(`[internal/create-task] Auto-run failed: ${result.error}`);
          run = null;
        }
      } catch (err) {
        console.warn(
          '[internal/create-task] Auto-run error:',
          err instanceof Error ? err.message : err
        );
        run = null;
      }
    }

    return NextResponse.json({ task, run }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[internal/create-task] error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
