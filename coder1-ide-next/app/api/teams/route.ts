import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to handle TypeScript service from JS context
let orchestratorInstance: any = null;

async function getOrchestrator() {
  if (!orchestratorInstance) {
    try {
      const mod = await import('@/services/ai-agent-orchestrator');
      orchestratorInstance = mod.aiOrchestrator;
    } catch (e) {
      console.error('Failed to load AI Agent Orchestrator:', e);
      return null;
    }
  }
  return orchestratorInstance;
}

// Mutex to prevent duplicate spawns
let spawnInProgress = false;

/**
 * POST /api/teams - Spawn a new team
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement } = body;

    if (!requirement || typeof requirement !== 'string' || !requirement.trim()) {
      return NextResponse.json({ error: 'A requirement description is required' }, { status: 400 });
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured. Add it to your .env.local file.' },
        { status: 400 }
      );
    }

    // Prevent duplicate spawns
    if (spawnInProgress) {
      return NextResponse.json({ error: 'A team is already being spawned' }, { status: 409 });
    }

    const orchestrator = await getOrchestrator();
    if (!orchestrator) {
      return NextResponse.json({ error: 'Agent orchestrator not available' }, { status: 503 });
    }

    spawnInProgress = true;
    try {
      const team = await orchestrator.spawnTeam(requirement.trim());
      return NextResponse.json({
        teamId: team.teamId,
        status: team.status,
        agents: team.agents.map((a: any) => ({
          agentId: a.agentId || a.sessionId,
          agentName: a.agentName,
          status: a.status,
          progress: a.progress,
          currentTask: a.currentTask,
        })),
      });
    } finally {
      spawnInProgress = false;
    }
  } catch (error: any) {
    console.error('Team spawn error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to spawn team' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/teams - Get all team statuses
 */
export async function GET() {
  try {
    const orchestrator = await getOrchestrator();
    if (!orchestrator) {
      return NextResponse.json({ teams: [] });
    }
    const teams = orchestrator.getAllTeams?.() || [];
    return NextResponse.json({ teams });
  } catch {
    return NextResponse.json({ teams: [] });
  }
}
