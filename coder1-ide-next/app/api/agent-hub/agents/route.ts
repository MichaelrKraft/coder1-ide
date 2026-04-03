import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { createAgent, listAgents, type CreateAgentInput } from '@/lib/agent-hub/agents';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
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
    skills: Array.isArray(body.skills) ? (body.skills as string[]) : [],
    workspacePath: workspacePath as string,
    model: resolvedModel,
    monthlyBudgetCents:
      typeof body.monthlyBudgetCents === 'number' ? body.monthlyBudgetCents : 0,
    maxConcurrentRuns:
      typeof body.maxConcurrentRuns === 'number' ? body.maxConcurrentRuns : 1,
  };

  try {
    const agent = createAgent(input);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('[agent-hub] POST /agents error:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
