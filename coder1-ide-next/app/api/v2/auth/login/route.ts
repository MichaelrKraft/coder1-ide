import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUserByUsername, updateLastLogin, createSession, deleteUserSessions } from '@/lib/auth/db';
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
      user = getUserByEmail(emailOrUsername);
    } else {
      user = getUserByUsername(emailOrUsername);
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
    updateLastLogin(user.id);
    
    // Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier,
    });
    
    // Delete old sessions if not remember me
    if (!rememberMe) {
      deleteUserSessions(user.id);
    }
    
    // Create new session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    
    createSession({
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
    // logger?.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}