/**
 * Johnny5 Setup API
 *
 * Handles Johnny5 configuration for self-hosted setup.
 * Johnny5 uses Claude Code CLI via Bridge - no API key required.
 *
 * POST /api/johnny5/setup
 *   - action: 'save-config' - Save setup configuration (permissions, proactivity)
 * GET /api/johnny5/setup - Get current setup status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  loadConfig,
  setPermissions,
  setProactivityLevel,
  setTelegramIntegration,
  markSetupComplete,
  getConfigSummary,
  Johnny5Permissions,
} from '@/lib/johnny5-config';
import { isLivingFilesEnabled, initializeLivingFiles } from '@/lib/living-files';
import { extractUserId } from '@/lib/auth/extract-user-id';

// Force dynamic rendering - setup state changes
export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

interface SaveConfigRequest {
  action: 'save-config';
  permissions: Johnny5Permissions;
  proactivityLevel: 'low' | 'medium' | 'high';
  telegram?: { botToken: string };
  userProfile?: {
    name?: string;
    role?: string;
    building?: string;
    workStyle?: string;
  };
}

type SetupRequest = SaveConfigRequest;

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET - Check setup status
 *
 * Returns the current setup state. Note that Bridge connection status
 * is checked via /api/bridge/status separately.
 */
export async function GET() {
  try {
    const summary = getConfigSummary();
    const config = loadConfig();

    return NextResponse.json({
      success: true,
      data: {
        isSetupComplete: summary.setupComplete,
        permissions: summary.permissions,
        proactivityLevel: summary.proactivityLevel,
        setupCompletedAt: config.setupCompletedAt,
        // Note: Bridge connection status is checked via /api/bridge/status
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Johnny5 Setup API] Error checking status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Handle setup actions
 *
 * Currently only supports 'save-config' action.
 * API key handling has been removed - Johnny5 uses Bridge instead.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    const body = (await request.json()) as SetupRequest;

    if (body.action === 'save-config') {
      // Save permissions
      setPermissions(body.permissions);

      // Save proactivity level
      setProactivityLevel(body.proactivityLevel);

      // Save Telegram integration if provided
      if (body.telegram?.botToken) {
        setTelegramIntegration({
          enabled: true,
          botToken: body.telegram.botToken,
        });
      }

      // Mark setup as complete
      markSetupComplete();

      // Initialize living files if feature flag is enabled
      if (isLivingFilesEnabled()) {
        try {
          initializeLivingFiles(body.userProfile, userId);
          console.log('[Johnny5 Setup] Living files initialized for user:', userId);
        } catch (lfError) {
          console.warn('[Johnny5 Setup] Living files initialization failed:', lfError);
          // Non-fatal — setup still completes
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Configuration saved successfully',
        data: getConfigSummary(),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Johnny5 Setup API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Setup failed',
      },
      { status: 500 }
    );
  }
}
