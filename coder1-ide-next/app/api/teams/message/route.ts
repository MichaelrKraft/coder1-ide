import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { teamId, agentId, message } = await request.json();

    if (!teamId || !agentId || !message) {
      return NextResponse.json({ error: 'teamId, agentId, and message are required' }, { status: 400 });
    }

    const mod = await import('@/services/ai-agent-orchestrator');
    const orchestrator = mod.aiOrchestrator;

    await orchestrator.sendAgentInput(teamId, agentId, message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 });
  }
}
