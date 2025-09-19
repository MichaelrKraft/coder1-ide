import { NextRequest, NextResponse } from 'next/server';
import { realClaudeAgentService } from '@/services/real-claude-agent-service';
import { mockEnhancedAgentService } from '@/services/mock-enhanced-agent-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { teamType = 'fullstack', useRealAI } = await request.json();
    
    // Check if real AI should be used and is configured
    const shouldUseRealAI = useRealAI && realClaudeAgentService.isConfigured();
    
    // Assemble team with appropriate service
    const team = shouldUseRealAI
      ? await realClaudeAgentService.assembleTeam(teamType)
      : await mockEnhancedAgentService.assembleTeam(teamType);

    return NextResponse.json({
      success: true,
      usingRealAI: shouldUseRealAI,
      team
    });
  } catch (error) {
    logger.error('Team assembly error:', error);
    return NextResponse.json(
      { error: 'Failed to assemble team', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}