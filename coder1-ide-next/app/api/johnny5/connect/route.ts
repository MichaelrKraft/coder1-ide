/**
 * Johnny5 Connection API
 *
 * Manages WebSocket connection to Johnny5 gateway for real-time Telegram relay.
 *
 * GET  /api/johnny5/connect - Returns connection status
 * POST /api/johnny5/connect - Triggers connection/reconnection
 *
 * Actions:
 * - "connect": Connect to Johnny5 (requires Johnny5 to be configured)
 * - "disconnect": Disconnect from Johnny5
 * - "reconnect": Disconnect and reconnect
 * - "auto-connect": Connect only if Johnny5 is configured (silent skip if not)
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { getMoltbotBridge } from '@/services/johnny5/moltbot-bridge';
import type { Johnny5APIResponse } from '@/types/johnny5';

// Force dynamic rendering - connection status changes frequently
export const dynamic = 'force-dynamic';

// Johnny5 configuration paths (stored in .manuslive for compatibility)
const MANUSLIVE_CONFIG = join(homedir(), '.manuslive', 'config.json');
const MANUSLIVE_DB = join(homedir(), '.manuslive', 'memory.sqlite');

// Default Johnny5 gateway port
const DEFAULT_JOHNNY5_PORT = 18789;

/**
 * Connection status response interface
 */
interface ConnectionStatusResponse {
  connected: boolean;
  authenticated: boolean;
  gatewayUrl: string | null;
  lastPingAt: string | null;
  lastPongAt: string | null;
  reconnectAttempts: number;
  error: string | null;
  fallbackActive: boolean;
  johnny5Configured: boolean;
  johnny5ConfigPath: string;
}

/**
 * Check if Johnny5 is configured on this machine
 */
function isJohnny5Configured(): boolean {
  return existsSync(MANUSLIVE_CONFIG) || existsSync(MANUSLIVE_DB);
}

/**
 * GET /api/johnny5/connect
 *
 * Returns the current connection status to Johnny5 gateway.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const bridge = getMoltbotBridge();
    const status = bridge.getStatus();
    const config = bridge.getConfig();

    const responseData: ConnectionStatusResponse = {
      connected: status.connected,
      authenticated: bridge.isConnected(), // isConnected checks both connected AND authenticated
      gatewayUrl: status.gatewayUrl || config.gatewayUrl,
      lastPingAt: status.lastPingAt ? status.lastPingAt.toISOString() : null,
      lastPongAt: status.lastPongAt ? status.lastPongAt.toISOString() : null,
      reconnectAttempts: status.reconnectAttempts,
      error: status.error,
      fallbackActive: status.fallbackActive,
      johnny5Configured: isJohnny5Configured(),
      johnny5ConfigPath: MANUSLIVE_CONFIG,
    };

    const response: Johnny5APIResponse<ConnectionStatusResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Johnny5 Connect API] GET error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get connection status',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/johnny5/connect
 *
 * Triggers connection or reconnection to Johnny5 gateway.
 *
 * Request body (optional):
 * {
 *   "gatewayUrl": "ws://localhost:18789",  // Optional override
 *   "action": "connect" | "disconnect" | "reconnect" | "auto-connect"
 * }
 *
 * Actions:
 * - "connect": Connect to Johnny5 (fails if not configured)
 * - "disconnect": Disconnect from Johnny5
 * - "reconnect": Disconnect and reconnect
 * - "auto-connect": Connect only if Johnny5 is configured (returns success even if skipped)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const bridge = getMoltbotBridge();

    // Parse request body
    let body: { gatewayUrl?: string; action?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine, use defaults
    }

    const action = body.action || 'connect';
    const gatewayUrl = body.gatewayUrl;

    let message: string;
    let skipped = false;

    // Handle auto-connect specially - it's a "soft" connect that doesn't fail if unconfigured
    if (action === 'auto-connect') {
      if (!isJohnny5Configured()) {
        console.log('[Johnny5 Connect API] Auto-connect skipped: Johnny5 not configured');
        skipped = true;
        message = 'Auto-connect skipped: Johnny5 is not configured on this machine';
      } else if (bridge.isConnected()) {
        message = 'Already connected to Johnny5 gateway';
      } else {
        try {
          const url = gatewayUrl || bridge.getConfig().gatewayUrl;
          console.log(`[Johnny5 Connect API] Auto-connecting to Johnny5 at ${url}`);
          await bridge.connect(url);
          message = `Auto-connected to Johnny5 gateway at ${url}`;
        } catch (connectError) {
          console.warn('[Johnny5 Connect API] Auto-connect failed:', connectError);
          skipped = true;
          message = `Auto-connect failed: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`;
        }
      }

      // Auto-connect always returns success (even if skipped or failed)
      const status = bridge.getStatus();
      const config = bridge.getConfig();

      const responseData: ConnectionStatusResponse & { message: string; skipped: boolean } = {
        connected: status.connected,
        authenticated: bridge.isConnected(),
        gatewayUrl: status.gatewayUrl || config.gatewayUrl,
        lastPingAt: status.lastPingAt ? status.lastPingAt.toISOString() : null,
        lastPongAt: status.lastPongAt ? status.lastPongAt.toISOString() : null,
        reconnectAttempts: status.reconnectAttempts,
        error: status.error,
        fallbackActive: status.fallbackActive,
        johnny5Configured: isJohnny5Configured(),
        johnny5ConfigPath: MANUSLIVE_CONFIG,
        message,
        skipped,
      };

      const response: Johnny5APIResponse<typeof responseData> = {
        success: true,
        data: responseData,
        timestamp: new Date(),
      };

      return NextResponse.json(response);
    }

    // Check if Johnny5 is configured before attempting connection (for connect/reconnect)
    if ((action === 'connect' || action === 'reconnect') && !isJohnny5Configured()) {
      const response: Johnny5APIResponse<{ message: string }> = {
        success: false,
        error: 'Johnny5 is not configured on this machine',
        data: {
          message: `No Johnny5 configuration found at ${MANUSLIVE_CONFIG}. Please run the setup wizard first.`,
        },
        timestamp: new Date(),
      };

      return NextResponse.json(response, { status: 400 });
    }

    switch (action) {
      case 'disconnect':
        bridge.disconnect();
        message = 'Disconnected from Johnny5 gateway';
        break;

      case 'reconnect':
        await bridge.reconnect(gatewayUrl);
        message = `Reconnected to Johnny5 gateway at ${gatewayUrl || bridge.getConfig().gatewayUrl}`;
        break;

      case 'connect':
      default:
        // Check if already connected
        if (bridge.isConnected()) {
          message = 'Already connected to Johnny5 gateway';
        } else {
          await bridge.connect(gatewayUrl);
          message = `Connected to Johnny5 gateway at ${gatewayUrl || bridge.getConfig().gatewayUrl}`;
        }
        break;
    }

    // Get updated status after action
    const status = bridge.getStatus();
    const config = bridge.getConfig();

    const responseData: ConnectionStatusResponse & { message: string } = {
      connected: status.connected,
      authenticated: bridge.isConnected(),
      gatewayUrl: status.gatewayUrl || config.gatewayUrl,
      lastPingAt: status.lastPingAt ? status.lastPingAt.toISOString() : null,
      lastPongAt: status.lastPongAt ? status.lastPongAt.toISOString() : null,
      reconnectAttempts: status.reconnectAttempts,
      error: status.error,
      fallbackActive: status.fallbackActive,
      johnny5Configured: isJohnny5Configured(),
      johnny5ConfigPath: MANUSLIVE_CONFIG,
      message,
    };

    const response: Johnny5APIResponse<typeof responseData> = {
      success: true,
      data: responseData,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Johnny5 Connect API] POST error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to Johnny5 gateway',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
