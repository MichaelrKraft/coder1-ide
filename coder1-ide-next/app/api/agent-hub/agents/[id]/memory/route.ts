import { NextRequest, NextResponse } from 'next/server';
import { listMemory, clearMemory, recallMemory } from '@/lib/agent-hub/memory';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

/**
 * GET /api/agent-hub/agents/[id]/memory
 * List memories or search with ?q= query param
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;
    const userId = getAuthenticatedUserId(request);
    const query = request.nextUrl.searchParams.get('q');

    if (query) {
      const results = recallMemory(agentId, userId, query);
      return NextResponse.json({ memories: results });
    }

    const memories = listMemory(agentId, userId);
    return NextResponse.json({ memories });
  } catch (error) {
    console.error('[Agent Hub] Memory GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve memories',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent-hub/agents/[id]/memory
 * Clear all memories for an agent
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
      {
        success: false,
        error: 'Failed to clear memories',
      },
      { status: 500 }
    );
  }
}
