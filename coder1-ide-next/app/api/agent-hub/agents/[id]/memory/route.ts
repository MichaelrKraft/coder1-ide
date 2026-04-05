import { NextRequest, NextResponse } from 'next/server';
import { listMemoryForAgent, clearMemory, recallMemory, storeMemory } from '@/lib/agent-hub/memory';
import type { MemoryScope } from '@/lib/agent-hub/memory';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getAgent } from '@/lib/agent-hub/agents';

/**
 * GET /api/agent-hub/agents/[id]/memory
 * List memories visible to this agent (agent + project + user scope).
 * Optional ?q= for search, ?scope= to filter by scope.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;
    const userId = getAuthenticatedUserId(request);
    const query = request.nextUrl.searchParams.get('q');
    const scopeFilter = request.nextUrl.searchParams.get('scope') as MemoryScope | null;

    if (query) {
      const results = recallMemory(agentId, userId, query);
      return NextResponse.json({ memories: results });
    }

    // Get agent to find its projectId
    const agent = getAgent(agentId, userId);
    const projectId = agent?.projectId ?? null;

    let memories = listMemoryForAgent(agentId, userId, projectId);

    // Filter by scope if requested
    if (scopeFilter) {
      memories = memories.filter(m => m.scope === scopeFilter);
    }

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('[Agent Hub] Memory GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve memories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-hub/agents/[id]/memory
 * Create a memory for this agent.
 * Body: { summary, scope?: 'agent' | 'project' | 'user', projectId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;
    const userId = getAuthenticatedUserId(request);
    const body = await request.json() as {
      summary: string;
      scope?: MemoryScope;
      projectId?: string;
    };

    if (!body.summary?.trim()) {
      return NextResponse.json({ error: 'summary is required' }, { status: 400 });
    }

    const scope = body.scope ?? 'agent';
    const projectId = body.projectId ?? null;

    const memory = storeMemory(agentId, userId, null, body.summary.trim(), scope, projectId);
    return NextResponse.json({ memory });
  } catch (error) {
    console.error('[Agent Hub] Memory POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent-hub/agents/[id]/memory
 * Clear all agent-scope memories for this agent.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;
    const userId = getAuthenticatedUserId(request);
    clearMemory(agentId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Agent Hub] Memory DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear memories' },
      { status: 500 }
    );
  }
}
