import { NextRequest, NextResponse } from 'next/server';
import { realClaudeAgentService } from '@/services/real-claude-agent-service';
import { mockEnhancedAgentService } from '@/services/mock-enhanced-agent-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { input, useRealAI } = await request.json();
    
    if (!input) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    // Check if real AI should be used and is configured
    const shouldUseRealAI = useRealAI && realClaudeAgentService.isConfigured();
    
    // Analyze with appropriate service
    const response = shouldUseRealAI
      ? await realClaudeAgentService.analyzeUserInput(input)
      : mockEnhancedAgentService.analyzeUserInput(input);

    return NextResponse.json({
      success: true,
      usingRealAI: shouldUseRealAI,
      response
    });
  } catch (error) {
    logger.error('Agent analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze input', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check service status
  const isRealAIConfigured = realClaudeAgentService.isConfigured();
  
  return NextResponse.json({
    status: 'ready',
    realAIConfigured: isRealAIConfigured,
    activeTeams: isRealAIConfigured ? realClaudeAgentService.getActiveTeams() : [],
    message: isRealAIConfigured 
      ? 'Real AI service is active and configured'
      : 'Using mock service (configure API key for real AI)'
  });
}