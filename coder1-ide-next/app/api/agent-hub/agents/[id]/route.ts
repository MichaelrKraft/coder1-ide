import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { getAgent, updateAgent, archiveAgent, type UpdateAgentInput } from '@/lib/agent-hub/agents';

export const dynamic = 'force-dynamic';

function getAuthenticatedUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) return decoded.userId;
    }
  }

  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    const decoded = verifyAccessToken(cookieToken);
    if (decoded) return decoded.userId;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'default';
  }

  return null;
}

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
  if (Array.isArray(body.skills)) input.skills = body.skills as string[];
  if (typeof body.workspacePath === 'string') input.workspacePath = body.workspacePath;
  if (typeof body.model === 'string' && allowedModels.includes(body.model)) {
    input.model = body.model as UpdateAgentInput['model'];
  }
  if (typeof body.monthlyBudgetCents === 'number') input.monthlyBudgetCents = body.monthlyBudgetCents;
  if (typeof body.maxConcurrentRuns === 'number') input.maxConcurrentRuns = body.maxConcurrentRuns;
  if (typeof body.status === 'string') input.status = body.status as UpdateAgentInput['status'];

  try {
    const agent = updateAgent(id, userId, input);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
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
