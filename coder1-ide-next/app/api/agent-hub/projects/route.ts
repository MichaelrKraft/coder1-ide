import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { createProject, listProjects } from '@/lib/agent-hub/projects';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projects = listProjects(userId);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('[agent-hub] GET /projects error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, color, workspacePath } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!workspacePath || typeof workspacePath !== 'string') {
    return NextResponse.json({ error: 'workspacePath is required' }, { status: 400 });
  }
  if (!path.isAbsolute(workspacePath as string)) {
    return NextResponse.json({ error: 'workspacePath must be absolute' }, { status: 400 });
  }

  try {
    const project = createProject({
      userId,
      name: (name as string).trim(),
      color: typeof color === 'string' ? color : '#00d9ff',
      workspacePath: (workspacePath as string).trim(),
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('[agent-hub] POST /projects error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
