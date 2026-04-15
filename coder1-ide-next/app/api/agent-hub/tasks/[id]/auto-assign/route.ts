import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getTask, updateTask } from '@/lib/agent-hub/tasks';
import { listAgents } from '@/lib/agent-hub/agents';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

function getAnthropicClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Anthropic client cannot be used in browser');
  }
  const Anthropic = require('@anthropic-ai/sdk').default;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
}

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  const task = getTask(id, userId);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const agents = listAgents(userId).filter((a) => a.status !== 'archived');
  if (agents.length === 0) {
    return NextResponse.json({ error: 'No agents available' }, { status: 422 });
  }

  const agentList = agents
    .map((a) => `- ${a.id}: ${a.role} (${(a.systemPrompt ?? '').slice(0, 100)})`)
    .join('\n');

  const prompt = `Task: "${task.title}"
Description: "${task.description ?? ''}"

Available agents:
${agentList}

Reply with ONLY the agent ID that best matches this task. No explanation.`;

  let pickedId: string;
  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 64,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = (response.content[0] as { type: string; text: string }).text ?? '';
    pickedId = text.trim();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Anthropic API error';
    console.error('[agent-hub] auto-assign Anthropic call failed:', message);
    return NextResponse.json({ error: 'Failed to call AI for assignment' }, { status: 502 });
  }

  const matchedAgent = agents.find((a) => a.id === pickedId);
  if (!matchedAgent) {
    console.error('[agent-hub] auto-assign returned unknown agent id:', pickedId);
    return NextResponse.json({ error: 'AI returned invalid agent ID' }, { status: 502 });
  }

  const updated = updateTask(id, userId, { agentId: pickedId });
  if (!updated) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }

  return NextResponse.json({ agentId: pickedId, agentRole: matchedAgent.role });
}
