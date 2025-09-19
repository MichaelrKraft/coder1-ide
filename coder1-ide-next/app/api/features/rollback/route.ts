import { NextRequest, NextResponse } from 'next/server';
import { featureFlags } from '@/config/feature-flags';
import { safeguardMonitor } from '@/services/safeguard-monitor';

/**
 * POST /api/features/rollback - Emergency rollback endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reason = 'Manual rollback triggered' } = body;
    
    console.log('🚨 Emergency rollback requested:', reason);
    
    // Trigger rollback
    await featureFlags.emergencyRollback(reason);
    
    // Stop monitoring to prevent further actions
    safeguardMonitor.stopMonitoring();
    
    // Get current status
    const statuses = featureFlags.getAllStatuses();
    
    return NextResponse.json({
      success: true,
      message: 'Emergency rollback completed',
      reason,
      features: statuses,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to execute rollback:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute emergency rollback'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/features/rollback - Check rollback status
 */
export async function GET(request: NextRequest) {
  try {
    const statuses = featureFlags.getAllStatuses();
    const enhancedConfig = featureFlags.getConfig('ENHANCED_SESSIONS');
    
    const rollbackStatus = {
      isRolledBack: enhancedConfig?.emergencyRollback || false,
      lastRollbackReason: enhancedConfig?.lastRollbackReason || null,
      rollbackAt: enhancedConfig?.rollbackAt || null,
      allFeaturesDisabled: Object.values(statuses).every((s: any) => !s.enabled),
      features: statuses
    };
    
    return NextResponse.json({
      success: true,
      ...rollbackStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get rollback status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve rollback status'
      },
      { status: 500 }
    );
  }
}