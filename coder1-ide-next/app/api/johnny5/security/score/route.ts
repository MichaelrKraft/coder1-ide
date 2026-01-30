/**
 * Johnny5 Security Score API
 *
 * GET /api/johnny5/security/score - Returns REAL security score and status
 *
 * This endpoint provides the overall security posture including:
 * - Security score (0-100)
 * - Score status (good/warning/critical)
 * - Active security warnings
 * - Current permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5SecurityState,
} from '@/types/johnny5';
import {
  calculateSecurityScore,
  getSecurityWarnings,
  getDefaultPermissions,
} from '@/services/johnny5/security-tracker';

// Force dynamic rendering - security state changes with actions
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get REAL security data from security tracker
    const warnings = getSecurityWarnings();
    const permissions = getDefaultPermissions();
    const { score, status: scoreStatus } = calculateSecurityScore();

    // Note: This endpoint returns a partial security state focused on score
    // Full audit log and alerts are available via separate endpoints
    const securityState: Partial<Johnny5SecurityState> = {
      score,
      scoreStatus,
      warnings,
      permissions,
      // Empty arrays - full data available at dedicated endpoints
      auditLog: [],
      promptInjectionAlerts: []
    };

    const response: Johnny5APIResponse<Partial<Johnny5SecurityState>> = {
      success: true,
      data: securityState,
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Security Score API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch security score',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
