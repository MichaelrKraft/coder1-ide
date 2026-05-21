import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getAgent, updateAgent, archiveAgent, isSupervisorCyclic, type UpdateAgentInput } from '@/lib/agent-hub/agents';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const agent = getAgent(id, userId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json({ agent });
  } catch (error) {
    console.error('[agent-hub] GET /agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to get agent' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const allowedModels = ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-6'];
  const input: UpdateAgentInput = {};

  if (typeof body.name === 'string') input.name = body.name;
  if (typeof body.role === 'string') input.role = body.role;
  if (typeof body.description === 'string') input.description = body.description;
  if (typeof body.systemPrompt === 'string') input.systemPrompt = body.systemPrompt;
  if (Array.isArray(body.skills)) input.skills = body.skills.filter((s: unknown): s is string => typeof s === 'string');
  if (Array.isArray(body.mcpServers)) input.mcpServers = body.mcpServers.filter((s: unknown): s is string => typeof s === 'string');
  if (typeof body.workspacePath === 'string') {
    if (!path.isAbsolute(body.workspacePath)) {
      return NextResponse.json({ error: 'workspacePath must be an absolute path' }, { status: 400 });
    }
    input.workspacePath = body.workspacePath;
  }
  if (typeof body.model === 'string' && allowedModels.includes(body.model)) {
    input.model = body.model as UpdateAgentInput['model'];
  }
  if (typeof body.monthlyBudgetCents === 'number') input.monthlyBudgetCents = body.monthlyBudgetCents;
  if (typeof body.maxConcurrentRuns === 'number') input.maxConcurrentRuns = body.maxConcurrentRuns;
  if (typeof body.status === 'string') input.status = body.status as UpdateAgentInput['status'];
  if (typeof body.projectId === 'string' || body.projectId === null) {
    input.projectId = body.projectId as string | null;
  }
  if (typeof body.telegramBotToken === 'string') input.telegramBotToken = body.telegramBotToken;
  if (typeof body.telegramChatId === 'string') input.telegramChatId = body.telegramChatId;
  if (typeof body.supervisorAgentId === 'string' || body.supervisorAgentId === null) {
    const newSupervisor = body.supervisorAgentId as string | null;
    if (newSupervisor) {
      if (isSupervisorCyclic(id, newSupervisor, userId)) {
        return NextResponse.json(
          { error: 'This would create a circular supervisor relationship' },
          { status: 400 }
        );
      }
    }
    input.supervisorAgentId = newSupervisor;
  }

  try {
    const agent = updateAgent(id, userId, input);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Update Telegram poller registry if bot token changed
    if (typeof body.telegramBotToken === 'string') {
      try {
        const registry = (global as Record<string, unknown>).telegramRegistry as
          | { register: (agent: { id: string; userId: string; telegram_bot_token?: string | null }) => void }
          | undefined;
        registry?.register({ id: agent.id, userId, telegram_bot_token: agent.telegramBotToken });
      } catch { /* registry may not be initialized in dev */ }
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('[agent-hub] PATCH /agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const success = archiveAgent(id, userId);
    if (!success) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] DELETE /agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to archive agent' }, { status: 500 });
  }
}
