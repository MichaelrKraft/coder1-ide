import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getProject, updateProject, deleteProject } from '@/lib/agent-hub/projects';
import path from 'path';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const project = getProject(id, userId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error('[agent-hub] GET /projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const input: Record<string, string> = {};

  if (typeof body.name === 'string') {
    input.name = body.name.trim();
  }
  if (typeof body.color === 'string') {
    input.color = body.color;
  }
  if (typeof body.workspacePath === 'string') {
    if (!path.isAbsolute(body.workspacePath)) {
      return NextResponse.json({ error: 'workspacePath must be absolute' }, { status: 400 });
    }
    input.workspacePath = body.workspacePath.trim();
  }

  if (Object.keys(input).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const project = updateProject(id, userId, input);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error('[agent-hub] PATCH /projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const success = deleteProject(id, userId);
    if (!success) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] DELETE /projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
