import { NextRequest, NextResponse } from 'next/server';
import { addToWaitlist, getWaitlistByEmail } from '@/lib/alpha-waitlist-db';
import { createUser, getUserByEmail, getUserByUsername, createSession } from '@/lib/auth/db';
import { generateTokens } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/bcrypt';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate a unique username from email prefix
 * Handles collisions by appending numbers (mike, mike1, mike2, etc.)
 */
function findAvailableUsername(base: string): string {
  // Sanitize base: alphanumeric + underscores only
  const sanitized = base.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!sanitized) return 'user'; // Fallback for invalid email prefixes

  let username = sanitized;
  let suffix = 1;

  // Check database for collisions
  while (getUserByUsername(username)) {
    username = `${sanitized}${suffix}`;
    suffix++;
    // Safety: prevent infinite loop
    if (suffix > 1000) {
      username = `${sanitized}${Date.now()}`;
      break;
    }
  }

  return username;
}

async function sendNotificationEmail(data: {
  email: string;
  name: string | null;
  redditUsername: string | null;
  source: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL || process.env.FEEDBACK_EMAIL_TO;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Coder1 <noreply@coder1.dev>';

  if (!apiKey || !notifyEmail) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: notifyEmail,
      subject: `[Coder1 Alpha] New Waitlist Signup — ${data.email}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #00D9FF 0%, #FB923C 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">New Alpha Waitlist Signup</h1>
          </div>
          <div style="background: #1a1a1a; padding: 30px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #999; padding: 8px 0; width: 140px;">Email</td>
                <td style="color: #fff; padding: 8px 0;">${data.email}</td>
              </tr>
              ${data.name ? `<tr>
                <td style="color: #999; padding: 8px 0;">Name</td>
                <td style="color: #fff; padding: 8px 0;">${data.name}</td>
              </tr>` : ''}
              ${data.redditUsername ? `<tr>
                <td style="color: #999; padding: 8px 0;">Reddit</td>
                <td style="color: #fff; padding: 8px 0;">u/${data.redditUsername}</td>
              </tr>` : ''}
              <tr>
                <td style="color: #999; padding: 8px 0;">Source</td>
                <td style="color: #fff; padding: 8px 0;">${data.source}</td>
              </tr>
              <tr>
                <td style="color: #999; padding: 8px 0;">Time</td>
                <td style="color: #fff; padding: 8px 0;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
        </div>
      `,
    });
  } catch (err) {
    // Non-blocking — don't fail the request if email fails
    console.error('[Waitlist] Notification email failed:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, name, redditUsername, source, utm_content } = body;
    const displayName = fullName || name || null;
    const resolvedSource = utm_content || source || 'website';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Step 1: Check if email already registered
    const existingUser = getUserByEmail(normalizedEmail);

    if (existingUser) {
      // User exists → create session and auto-login
      const { accessToken, refreshToken, expiresAt } = generateTokens({
        userId: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        subscriptionTier: existingUser.subscription_tier,
      });

      // Get request metadata
      const userAgent = request.headers.get('user-agent') || undefined;
      const ip = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') || undefined;

      createSession({
        user_id: existingUser.id,
        token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        user_agent: userAgent,
        ip_address: ip,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Welcome back! Logging you in...',
      });

      // Set auth cookies
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
    }

    // Step 2: Generate unique username from email
    const baseUsername = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const username = findAvailableUsername(baseUsername);

    // Step 3: Generate secure random password
    const password = randomBytes(32).toString('hex');
    const passwordHash = await hashPassword(password);

    // Step 4: Create user account (with UNIQUE constraint error handling)
    let user;
    try {
      user = createUser({
        email: normalizedEmail,
        username,
        password_hash: passwordHash,
      });
    } catch (dbError: any) {
      // Handle race condition: username taken between check and insert
      if (dbError.message?.includes('UNIQUE constraint failed')) {
        // Try once more with timestamped username
        const retryUsername = `${baseUsername}${Date.now()}`;
        user = createUser({
          email: normalizedEmail,
          username: retryUsername,
          password_hash: passwordHash,
        });
      } else {
        throw dbError;
      }
    }

    // Step 5: Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier,
    });

    // Step 6: Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') || undefined;

    createSession({
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ip,
    });

    // Step 7: Add to waitlist for analytics (fire-and-forget)
    try {
      const ipAddress = ip || 'unknown';
      const ua = userAgent || 'unknown';

      addToWaitlist({
        email: normalizedEmail,
        name: displayName,
        reddit_username: redditUsername || null,
        source: resolvedSource,
        ip_address: ipAddress,
        user_agent: ua,
      });

      // Send notification email to Mike
      sendNotificationEmail({
        email: normalizedEmail,
        name: displayName,
        redditUsername: redditUsername || null,
        source: resolvedSource,
      });
    } catch (waitlistError) {
      // Non-blocking - don't fail account creation if waitlist insert fails
      console.error('[Waitlist] Analytics insert failed:', waitlistError);
    }

    // Step 8: Set auth cookies and return success
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
    }, { status: 201 });

    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('[AlphaWaitlist] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process signup' },
      { status: 500 }
    );
  }
}
