import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Import pairing codes from generate-code endpoint
import { pairingCodes } from '../generate-code/route';

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'coder1-bridge-secret-2025';

// Active bridges tracking
const activeBridges = new Map<string, {
  userId: string;
  bridgeId: string;
  connectedAt: number;
  claudeVersion?: string;
  platform?: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, version, platform, claudeVersion } = body;

    if (!code) {
      return NextResponse.json({ 
        success: false,
        error: 'Pairing code required' 
      }, { status: 400 });
    }

    // Validate 6-digit code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid code format' 
      }, { status: 400 });
    }

    // Check if code exists and is valid
    const pairingData = pairingCodes.get(code);
    
    if (!pairingData) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid or expired pairing code' 
      }, { status: 400 });
    }

    // Check expiration
    if (pairingData.expires < Date.now()) {
      pairingCodes.delete(code);
      return NextResponse.json({ 
        success: false,
        error: 'Pairing code expired' 
      }, { status: 400 });
    }

    // Generate bridge ID
    const bridgeId = crypto.randomBytes(16).toString('hex');

    // Create JWT token for authentication
    const token = jwt.sign(
      {
        userId: pairingData.userId,
        bridgeId,
        platform,
        claudeVersion
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store active bridge
    activeBridges.set(bridgeId, {
      userId: pairingData.userId,
      bridgeId,
      connectedAt: Date.now(),
      claudeVersion,
      platform
    });

    // Remove used pairing code
    pairingCodes.delete(code);

    return NextResponse.json({
      success: true,
      token,
      bridgeId,
      userId: pairingData.userId,
      message: 'Bridge paired successfully'
    });

  } catch (error) {
    console.error('Pairing error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Export for WebSocket authentication
export { activeBridges, JWT_SECRET };