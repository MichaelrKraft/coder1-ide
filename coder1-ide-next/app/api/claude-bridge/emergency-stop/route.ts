import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';

/**
 * POST /api/claude-bridge/emergency-stop
 * Emergency stop all Claude Code Bridge operations
 */
export async function POST(request: NextRequest) {
  try {
    const { reason } = await request.json();
    
    logger.warn(`🚨 [BRIDGE] Emergency stop requested from UI: ${reason || 'No reason provided'}`);
    
    const bridgeService = getClaudeCodeBridgeService();
    await bridgeService.emergencyStop(reason || 'UI emergency stop');
    
    return NextResponse.json({
      success: true,
      message: 'Emergency stop executed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ [BRIDGE] Emergency stop failed:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to execute emergency stop: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/claude-bridge/emergency-stop
 * Reset emergency stop state
 */
export async function DELETE(request: NextRequest) {
  try {
    logger.info('🔄 [BRIDGE] Emergency stop reset requested from UI');
    
    const bridgeService = getClaudeCodeBridgeService();
    bridgeService.resetEmergencyStop();
    
    return NextResponse.json({
      success: true,
      message: 'Emergency stop reset successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ [BRIDGE] Emergency stop reset failed:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to reset emergency stop: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}