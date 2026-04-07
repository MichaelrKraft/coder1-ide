import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUserByUsername, updateLastLogin, createSession, deleteUserSessions } from '@/lib/auth';
import { comparePassword } from '@/lib/auth/bcrypt';
import { generateTokens } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailOrUsername, password, rememberMe = false } = body;
    
    // Validate input
    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: 'Email/username and password are required' },
        { status: 400 }
      );
    }
    
    // Find user by email or username
    let user;
    if (emailOrUsername.includes('@')) {
      user = await getUserByEmail(emailOrUsername);
    } else {
      user = await getUserByUsername(emailOrUsername);
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Update last login
    await updateLastLogin(user.id);
    
    // Sync login event to Go High Level - disabled for deployment
    try {
      if (process.env.ENABLE_GHL_INTEGRATION === 'true') {
        // GHL integration temporarily disabled for deployment
        // const { ghlUserSync } = await import('@/services/ghl-user-sync');
        // await ghlUserSync.syncUserLogin(user.id);
        console.log('[GHL] Login sync disabled for deployment');
      }
    } catch (ghlError) {
      // Don't fail login if GHL sync fails
      // logger?.warn('Failed to sync login to GHL:', ghlError);
    }
    
    // Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier,
    });
    
    // Delete old sessions if not remember me
    if (!rememberMe) {
      await deleteUserSessions(user.id);
    }
    
    // Create new session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    
    await createSession({
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ip,
    });
    
    // Create response
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          subscriptionTier: user.subscription_tier,
          emailVerified: user.email_verified,
        },
        accessToken,
        refreshToken,
      },
      { status: 200 }
    );
    
    // Set cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
    
    response.cookies.set('auth-token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    });
    
    response.cookies.set('refresh-token', refreshToken, {
      ...cookieOptions,
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days if remember me, else 7 days
    });
    
    return response;
  } catch (error) {
    // Log detailed error for debugging
    console.error('[Auth Login] Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      raw: JSON.stringify(error),
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}