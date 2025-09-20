/**
 * Bridge Pairing API Endpoint
 * Handles pairing code validation and token generation
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { bridgeManager } from '@/services/bridge-manager';

// Get JWT secret from environment or generate one
const JWT_SECRET = process.env.BRIDGE_JWT_SECRET || 'coder1-bridge-secret-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { code, version, platform, claudeVersion } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Pairing code is required' },
        { status: 400 }
      );
    }

    // Validate pairing code
    const userId = bridgeManager.validatePairingCode(code);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired pairing code' },
        { status: 401 }
      );
    }

    // Generate JWT token for the bridge
    const token = jwt.sign(
      {
        userId,
        type: 'bridge',
        version,
        platform,
        claudeVersion
      },
      JWT_SECRET,
      {
        expiresIn: '24h'
      }
    );

    // Generate bridge ID (will be replaced when socket connects)
    const bridgeId = `pending_${Date.now()}`;

    console.log(`[Bridge API] Pairing successful for user ${userId}`);

    return NextResponse.json({
      success: true,
      token,
      bridgeId,
      userId,
      capabilities: ['claude', 'files', 'git'],
      config: {
        heartbeatInterval: 30000,
        maxCommandTimeout: 60000,
        reconnectDelay: 1000,
        reconnectDelayMax: 30000
      }
    });
  } catch (error) {
    console.error('[Bridge API] Pairing error:', error);
    
    return NextResponse.json(
      { error: 'Failed to pair bridge' },
      { status: 500 }
    );
  }
}