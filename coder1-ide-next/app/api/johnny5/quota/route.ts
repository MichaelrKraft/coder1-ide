/**
 * Johnny5 Quota API
 *
 * GET /api/johnny5/quota - Returns the user's current Johnny5 usage quota
 *
 * Requires authentication via Bearer token in Authorization header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJohnny5Quota } from '@/lib/auth';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader ?? undefined);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get quota for user
    const quota = await getJohnny5Quota(decoded.userId);

    if (!quota) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        messageCount: quota.messageCount,
        limit: quota.limit === Infinity ? 999999 : quota.limit,
        remaining: quota.remaining === Infinity ? 999999 : quota.remaining,
        tierType: quota.tierType,
        isProSubscriber: quota.isProSubscriber,
        resetDate: quota.resetDate,
      },
    });
  } catch (error) {
    console.error('[Johnny5 Quota API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get quota' },
      { status: 500 }
    );
  }
}
