import { NextRequest, NextResponse } from 'next/server';
import { withAPIMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';
import { generateTokens, verifyAccessToken, refreshAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

interface SessionRequest {
  email?: string;
  alphaCode?: string;
  action: 'create' | 'verify' | 'refresh';
}

async function sessionHandler({ req }: { req: NextRequest }): Promise<NextResponse> {
  try {
    const body: SessionRequest = await req.json();
    const { email, alphaCode, action } = body;

    switch (action) {
      case 'create':
        return await createSession(email, alphaCode);
      
      case 'verify':
        return await verifySession(req);
      
      case 'refresh':
        return await refreshSession(req);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Session handler error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}

async function createSession(email?: string, alphaCode?: string): Promise<NextResponse> {
  try {
    // Validate alpha access code
    const validAlphaCodes = (process.env.ALPHA_CODES || 'coder1-alpha-2025').split(',');

    if (!alphaCode || !validAlphaCodes.includes(alphaCode)) {
      logger.warn(`Invalid alpha code attempt: ${alphaCode} for ${email}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid alpha access code',
          hint: 'Contact Michael for early access'
        },
        { status: 403 }
      );
    }

    // Generate a stable user ID for this alpha user
    const userId = `alpha-${randomBytes(4).toString('hex')}`;
    const userEmail = email || 'alpha-user@coder1.dev';

    // Issue real JWT tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens({
      userId,
      email: userEmail,
      username: userEmail.split('@')[0],
      subscriptionTier: 'alpha',
    });

    logger.info(`Session created for ${userEmail}`);

    const response = NextResponse.json({
      success: true,
      session: {
        token: accessToken,
        user: {
          id: userId,
          email: userEmail,
          tier: 'alpha',
          access: ['files', 'terminal', 'ai', 'memory']
        },
        expiresAt: expiresAt.toISOString()
      }
    });

    // Set JWT access token as httpOnly cookie (browser clients)
    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 // 15 minutes (matches JWT expiry)
    });

    // Set JWT refresh token as httpOnly cookie
    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth', // Only sent to auth endpoints
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error) {
    logger.error('Session creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

async function verifySession(req: NextRequest): Promise<NextResponse> {
  try {
    // Try Bearer token first, then cookie
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('auth-token')?.value;
    const token = authHeader ? extractTokenFromHeader(authHeader) : cookieToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        valid: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          tier: decoded.subscriptionTier,
          access: ['files', 'terminal', 'ai', 'memory']
        }
      }
    });

  } catch (error) {
    logger.error('Session verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Session verification failed' },
      { status: 500 }
    );
  }
}

async function refreshSession(req: NextRequest): Promise<NextResponse> {
  try {
    const refreshTokenCookie = req.cookies.get('refresh-token')?.value;

    if (!refreshTokenCookie) {
      return NextResponse.json(
        { success: false, error: 'No refresh token' },
        { status: 401 }
      );
    }

    // Use the real JWT refresh mechanism
    const result = refreshAccessToken(refreshTokenCookie);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      session: {
        token: result.accessToken,
        refreshed: true,
        expiresAt: result.expiresAt.toISOString()
      }
    });

    // Update access token cookie
    response.cookies.set('auth-token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 // 15 minutes
    });

    return response;

  } catch (error) {
    logger.error('Session refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}

// Note: Token generation and validation now handled by @/lib/auth/jwt

// Export WITHOUT body validation since we need to read the body in the handler
// Auth endpoints don't need auth validation (they create the auth)
export const POST = withAPIMiddleware(sessionHandler, {
  rateLimit: 'auth',
  logRequests: true,
  validateBody: false, // Don't validate body - we'll read it in the handler
  requireAuth: false   // Auth endpoints create auth, don't require it
});