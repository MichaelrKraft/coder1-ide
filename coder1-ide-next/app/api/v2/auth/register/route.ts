import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // REMOVED: // REMOVED: console.log('Registration endpoint hit');
    
    const body = await request.json();
    // REMOVED: // REMOVED: console.log('Request body:', body);
    
    const { email, username, password } = body;
    
    // Import dynamically to avoid issues
    const { createUser, getUserByEmail, getUserByUsername } = await import('@/lib/auth/db');
    const { hashPassword, validateEmail, validateUsername, validatePasswordStrength } = await import('@/lib/auth/bcrypt');
    const { generateTokens } = await import('@/lib/auth/jwt');
    const { createSession } = await import('@/lib/auth/db');
    
    // Validate input
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate username format
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        { error: usernameValidation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingEmailUser = getUserByEmail(email);
    if (existingEmailUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Check if username already exists
    const existingUsernameUser = getUserByUsername(username);
    if (existingUsernameUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = createUser({
      email,
      username,
      password_hash: passwordHash,
    });
    
    // Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier,
    });
    
    // Create session
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
    
    // Create response with tokens
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          subscriptionTier: user.subscription_tier,
        },
        accessToken,
        refreshToken,
      },
      { status: 201 }
    );
    
    // Set cookies for tokens
    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });
    
    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    return response;
  } catch (error) {
    // logger?.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}