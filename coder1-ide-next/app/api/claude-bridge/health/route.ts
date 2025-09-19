import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';

/**
 * GET /api/claude-bridge/health
 * Get Claude Code Bridge service health status
 */
export async function GET(request: NextRequest) {
  try {
    const bridgeService = getClaudeCodeBridgeService();
    const health = bridgeService.getServiceHealth();
    
    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ [BRIDGE] Health check failed:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to get service health: ${error instanceof Error ? error.message : 'Unknown error'}`,
      health: {
        status: 'error',
        teams: 0,
        maxTeams: 0,
        emergencyStop: true,
        processes: 0,
        uptime: 0
      }
    }, { status: 500 });
  }
}