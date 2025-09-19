import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { getUserById, getSessionByToken } from '@/lib/auth/db';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or header
    const cookieToken = request.cookies.get('auth-token')?.value;
    const headerToken = extractTokenFromHeader(request.headers.get('authorization') || '');
    const token = cookieToken || headerToken;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Check if session exists
    const session = getSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 401 }
      );
    }
    
    // Get user
    const user = getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return user data
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          subscriptionTier: user.subscription_tier,
          subscriptionStatus: user.subscription_status,
          emailVerified: user.email_verified,
          createdAt: user.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // logger?.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}