/**
 * Coder1 Bridge Connection API
 * Handles initial Bridge service connections and authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory storage for alpha (would use Redis/database in production)
const bridgeConnections = new Map();
const bridgeAuth = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      bridgeId, 
      version, 
      platform, 
      claudeCliAvailable, 
      capabilities = [],
      authToken 
    } = body;

    // Basic validation
    if (!bridgeId) {
      return NextResponse.json(
        { error: 'Bridge ID required' },
        { status: 400 }
      );
    }

    // Generate session for this bridge connection
    const sessionId = crypto.randomBytes(16).toString('hex');
    const connectionTime = Date.now();

    // Store bridge connection info
    const bridgeInfo = {
      bridgeId,
      sessionId,
      version: version || '1.0.0-alpha',
      platform: platform || 'unknown',
      claudeCliAvailable: claudeCliAvailable || false,
      capabilities: capabilities,
      connected: true,
      connectionTime,
      lastHeartbeat: connectionTime,
      authToken: authToken || 'anonymous'
    };

    bridgeConnections.set(bridgeId, bridgeInfo);

    // Generate authentication token for WebSocket connection
    const wsAuthToken = crypto.randomBytes(32).toString('hex');
    bridgeAuth.set(wsAuthToken, {
      bridgeId,
      sessionId,
      expiresAt: connectionTime + 300000, // 5 minute expiry
      permissions: capabilities.includes('claude-cli') 
        ? ['terminal', 'files', 'claude-cli', 'bridge'] 
        : ['terminal', 'files']
    });

    console.log('🌉 Bridge connected:', {
      bridgeId: bridgeId.substring(0, 16) + '...',
      sessionId: sessionId.substring(0, 8) + '...',
      platform,
      claudeCliAvailable,
      capabilities
    });

    return NextResponse.json({
      success: true,
      sessionId,
      wsAuthToken,
      serverCapabilities: [
        'websocket-relay',
        'command-execution',
        'file-operations',
        'session-persistence'
      ],
      heartbeatInterval: 30000, // 30 seconds
      message: 'Bridge connection established'
    });

  } catch (error) {
    console.error('❌ Bridge connection error:', error);
    return NextResponse.json(
      { error: 'Failed to establish bridge connection' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bridgeId = searchParams.get('bridgeId');

    if (bridgeId && bridgeConnections.has(bridgeId)) {
      const bridge = bridgeConnections.get(bridgeId);
      return NextResponse.json({
        connected: bridge.connected,
        sessionId: bridge.sessionId,
        uptime: Date.now() - bridge.connectionTime,
        lastHeartbeat: bridge.lastHeartbeat,
        claudeCliAvailable: bridge.claudeCliAvailable
      });
    }

    // Return summary of all connected bridges
    const connectedBridges = Array.from(bridgeConnections.values()).map(bridge => ({
      bridgeId: bridge.bridgeId.substring(0, 16) + '...',
      platform: bridge.platform,
      claudeCliAvailable: bridge.claudeCliAvailable,
      uptime: Date.now() - bridge.connectionTime,
      capabilities: bridge.capabilities
    }));

    return NextResponse.json({
      service: 'Coder1 Bridge API',
      status: 'healthy',
      connectedBridges: connectedBridges.length,
      bridges: connectedBridges
    });

  } catch (error) {
    console.error('❌ Bridge status error:', error);
    return NextResponse.json(
      { error: 'Failed to get bridge status' },
      { status: 500 }
    );
  }
}

// Export bridge connection utilities for WebSocket server
export function getBridgeConnection(bridgeId: string) {
  return bridgeConnections.get(bridgeId);
}

export function updateBridgeHeartbeat(bridgeId: string) {
  const bridge = bridgeConnections.get(bridgeId);
  if (bridge) {
    bridge.lastHeartbeat = Date.now();
    bridgeConnections.set(bridgeId, bridge);
  }
}

export function validateBridgeAuth(authToken: string) {
  const auth = bridgeAuth.get(authToken);
  if (!auth) {
    return { valid: false, error: 'Invalid auth token' };
  }

  if (Date.now() > auth.expiresAt) {
    bridgeAuth.delete(authToken);
    return { valid: false, error: 'Auth token expired' };
  }

  return {
    valid: true,
    bridgeId: auth.bridgeId,
    sessionId: auth.sessionId,
    permissions: auth.permissions
  };
}

export function disconnectBridge(bridgeId: string) {
  const bridge = bridgeConnections.get(bridgeId);
  if (bridge) {
    bridge.connected = false;
    bridge.disconnectionTime = Date.now();
    bridgeConnections.set(bridgeId, bridge);
    console.log('🌉 Bridge disconnected:', bridgeId.substring(0, 16) + '...');
  }
}