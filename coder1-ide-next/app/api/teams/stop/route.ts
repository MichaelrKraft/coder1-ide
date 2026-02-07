import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const mod = await import('@/services/ai-agent-orchestrator');
    const orchestrator = mod.aiOrchestrator;

    const teams = orchestrator.getAllTeams?.() || [];
    const team = teams.find((t: any) => t.teamId === teamId);
    if (team) {
      team.status = 'error';
      for (const agent of team.agents) {
        if (agent.status !== 'completed') {
          agent.status = 'error';
          agent.currentTask = 'Stopped by user';
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to stop team' }, { status: 500 });
  }
}
