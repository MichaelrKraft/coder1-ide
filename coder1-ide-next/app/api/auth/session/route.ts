import { NextRequest, NextResponse } from 'next/server';
import { withAPIMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

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
    // For alpha launch: Simple validation
    const validAlphaCodes = [
      'coder1-alpha-2025',
      'early-adopter',
      'claude-code-user'
    ];

    // Validate alpha access
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

    // Generate session token
    const sessionToken = generateSessionToken();
    const bearerToken = generateBearerToken();

    logger.info(`✅ Session created for ${email || 'anonymous'} with alpha code: ${alphaCode}`);

    const response = NextResponse.json({
      success: true,
      session: {
        token: bearerToken,
        user: {
          id: `alpha-${randomBytes(4).toString('hex')}`,
          email: email || 'alpha-user@coder1.dev',
          tier: 'alpha',
          access: ['files', 'terminal', 'ai', 'memory']
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    });

    // Set secure HTTP-only cookie for session
    response.cookies.set('coder1-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 hours
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
    const sessionToken = req.cookies.get('coder1-session')?.value;
    const authHeader = req.headers.get('authorization');

    if (!sessionToken && !authHeader) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    // Verify session token or bearer token
    const isValid = sessionToken ? isValidSessionToken(sessionToken) : 
                   authHeader ? isValidBearerToken(authHeader) : false;

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        valid: true,
        user: {
          id: 'alpha-user',
          tier: 'alpha',
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
    const sessionToken = req.cookies.get('coder1-session')?.value;
    
    if (!sessionToken || !isValidSessionToken(sessionToken)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const newSessionToken = generateSessionToken();
    const newBearerToken = generateBearerToken();

    const response = NextResponse.json({
      success: true,
      session: {
        token: newBearerToken,
        refreshed: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });

    // Update cookie
    response.cookies.set('coder1-session', newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60
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

// Helper functions
function generateSessionToken(): string {
  return `sess_${randomBytes(16).toString('hex')}_${Date.now()}`;
}

function generateBearerToken(): string {
  return `coder1-alpha-${randomBytes(20).toString('hex')}`;
}

function isValidSessionToken(token: string): boolean {
  // Simple validation for alpha
  return token.startsWith('sess_') && token.includes('_') && token.length > 20;
}

function isValidBearerToken(authHeader: string): boolean {
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  return token.startsWith('coder1-alpha-') && token.length > 20;
}

// Export WITHOUT body validation since we need to read the body in the handler
// Auth endpoints don't need auth validation (they create the auth)
export const POST = withAPIMiddleware(sessionHandler, {
  rateLimit: 'auth',
  logRequests: true,
  validateBody: false, // Don't validate body - we'll read it in the handler
  requireAuth: false   // Auth endpoints create auth, don't require it
});