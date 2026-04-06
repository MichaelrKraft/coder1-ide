import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';

const MAX_SIZE = 8 * 1024;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    const db = getAgentHubDatabase();
    const project = db
      .prepare('SELECT workspace_path FROM agent_hub_projects WHERE id = ?')
      .get(projectId) as { workspace_path: string } | undefined;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const contextPath = path.join(project.workspace_path, 'CONTEXT.md');
    const resolved = path.resolve(contextPath);
    if (!resolved.startsWith(path.resolve(project.workspace_path))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ content: '' });
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    return NextResponse.json({ content: content.slice(0, MAX_SIZE) });
  } catch (error) {
    console.error('[agent-hub] GET /settings/project-context error:', error);
    return NextResponse.json({ error: 'Failed to read context' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { projectId, content } = body;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const db = getAgentHubDatabase();
    const project = db
      .prepare('SELECT workspace_path FROM agent_hub_projects WHERE id = ?')
      .get(projectId) as { workspace_path: string } | undefined;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const contextPath = path.join(project.workspace_path, 'CONTEXT.md');
    const resolved = path.resolve(contextPath);
    if (!resolved.startsWith(path.resolve(project.workspace_path))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const trimmed = content.slice(0, MAX_SIZE);
    fs.writeFileSync(resolved, trimmed, 'utf-8');
    return NextResponse.json({ success: true, length: trimmed.length });
  } catch (error) {
    console.error('[agent-hub] PUT /settings/project-context error:', error);
    return NextResponse.json({ error: 'Failed to save context' }, { status: 500 });
  }
}
