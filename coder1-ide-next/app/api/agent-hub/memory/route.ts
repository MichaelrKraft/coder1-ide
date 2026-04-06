import { NextRequest, NextResponse } from 'next/server';
import { listMemoryByScope, storeScopedMemory, deleteMemory } from '@/lib/agent-hub/memory';
import type { MemoryScope } from '@/lib/agent-hub/memory';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

/**
 * GET /api/agent-hub/memory
 * List memories by scope.
 * Query params: scope=user|project, projectId (required if scope=project)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get('scope') as MemoryScope | null;
  const projectId = request.nextUrl.searchParams.get('projectId') ?? undefined;

  if (!scope || !['user', 'project'].includes(scope)) {
    return NextResponse.json({ error: 'scope must be user or project' }, { status: 400 });
  }

  if (scope === 'project' && !projectId) {
    return NextResponse.json({ error: 'projectId is required for project scope' }, { status: 400 });
  }

  const memories = listMemoryByScope(userId, scope, projectId);
  return NextResponse.json({ memories });
}

/**
 * POST /api/agent-hub/memory
 * Create a user-scope or project-scope memory (not tied to a specific agent).
 * Body: { summary, scope: 'user' | 'project', projectId?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    summary: string;
    scope: MemoryScope;
    projectId?: string;
  };

  if (!body.summary?.trim()) {
    return NextResponse.json({ error: 'summary is required' }, { status: 400 });
  }

  if (!body.scope || !['user', 'project'].includes(body.scope)) {
    return NextResponse.json({ error: 'scope must be user or project' }, { status: 400 });
  }

  if (body.scope === 'project' && !body.projectId) {
    return NextResponse.json({ error: 'projectId is required for project scope' }, { status: 400 });
  }

  const memory = storeScopedMemory(userId, body.summary.trim(), body.scope, body.projectId ?? null);
  return NextResponse.json({ memory });
}

/**
 * DELETE /api/agent-hub/memory
 * Delete a single memory by ID.
 * Body: { id }
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { id: string };
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const deleted = deleteMemory(body.id, userId);
  if (!deleted) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
