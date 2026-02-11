import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// In-memory storage for reset tokens (replace with database in production)
const resetTokens = new Map<string, { email: string; expires: Date }>();

// Email transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token with 1-hour expiration
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    resetTokens.set(token, { email, expires });

    // Clean up expired tokens
    for (const [key, value] of resetTokens.entries()) {
      if (value.expires < new Date()) {
        resetTokens.delete(key);
      }
    }

    // Create reset URL
    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}`;

    // Send email
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@coder1.dev',
        to: email,
        subject: 'Reset Your Coder1 Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #00D9FF 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #00D9FF; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reset Your Password</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p>We received a request to reset your Coder1 account password.</p>
                <p>Click the button below to create a new password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>© 2026 Coder1. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Reset Your Coder1 Password

          Hi there,

          We received a request to reset your Coder1 account password.

          Click this link to reset your password:
          ${resetUrl}

          This link will expire in 1 hour.

          If you didn't request a password reset, you can safely ignore this email.

          © 2026 Coder1. All rights reserved.
        `,
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);

      // For development: return the reset URL in the response
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: 'Development mode: Email sending skipped',
          resetUrl, // Include URL for testing
        });
      }

      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify token endpoint (used by reset page)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 }
    );
  }

  const tokenData = resetTokens.get(token);

  if (!tokenData) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 400 }
    );
  }

  if (tokenData.expires < new Date()) {
    resetTokens.delete(token);
    return NextResponse.json(
      { error: 'Token has expired' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    email: tokenData.email,
  });
}
