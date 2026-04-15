import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { access } from 'fs/promises';
import { createAgent, listAgents, seedDefaultAgents, type CreateAgentInput } from '@/lib/agent-hub/agents';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    seedDefaultAgents(userId);
    const agents = listAgents(userId);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[agent-hub] GET /agents error:', error);
    return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, role, workspacePath, model, systemPrompt } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!role || typeof role !== 'string') {
    return NextResponse.json({ error: 'role is required' }, { status: 400 });
  }
  if (!workspacePath || typeof workspacePath !== 'string') {
    return NextResponse.json({ error: 'workspacePath is required' }, { status: 400 });
  }
  if (!path.isAbsolute(workspacePath)) {
    return NextResponse.json({ error: 'workspacePath must be an absolute path' }, { status: 400 });
  }

  // Verify the workspace directory exists on the server's filesystem.
  // For bridge-based setups this won't catch remote paths, but catches
  // obvious typos and non-existent paths before they fail silently at run time.
  try {
    await access(workspacePath as string);
  } catch {
    return NextResponse.json(
      { error: `workspacePath does not exist or is not accessible: ${workspacePath}` },
      { status: 400 }
    );
  }

  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return NextResponse.json({ error: 'systemPrompt is required' }, { status: 400 });
  }

  const allowedModels = ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-6'];
  const resolvedModel = (typeof model === 'string' && allowedModels.includes(model)
    ? model
    : 'claude-sonnet-4-6') as CreateAgentInput['model'];

  const input: CreateAgentInput = {
    userId,
    name: name as string,
    role: role as string,
    description: typeof body.description === 'string' ? body.description : '',
    systemPrompt: systemPrompt as string,
    skills: Array.isArray(body.skills) ? body.skills.filter((s: unknown): s is string => typeof s === 'string') : [],
    mcpServers: Array.isArray(body.mcpServers) ? body.mcpServers.filter((s: unknown): s is string => typeof s === 'string') : [],
    workspacePath: workspacePath as string,
    model: resolvedModel,
    monthlyBudgetCents:
      typeof body.monthlyBudgetCents === 'number' ? body.monthlyBudgetCents : 0,
    maxConcurrentRuns:
      typeof body.maxConcurrentRuns === 'number' ? body.maxConcurrentRuns : 1,
    supervisorAgentId:
      typeof body.supervisorAgentId === 'string' && body.supervisorAgentId
        ? body.supervisorAgentId
        : null,
  };

  try {
    const agent = createAgent(input);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('[agent-hub] POST /agents error:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
