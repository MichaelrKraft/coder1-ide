import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

// NOTE: You'll need to replace this with your actual database access
// This is a placeholder showing the structure you need

// Import the same resetTokens Map from the reset-password route
// In production, use a shared database or Redis
const resetTokens = new Map<string, { email: string; expires: Date }>();

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Verify token
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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: Update password in your database
    // Example with your database:
    // await db.users.update({
    //   where: { email: tokenData.email },
    //   data: { password: hashedPassword }
    // });

    // For now, log to console (DEVELOPMENT ONLY)
    console.log(`Password reset for ${tokenData.email}`);
    console.log(`New hashed password: ${hashedPassword}`);

    // Delete the used token
    resetTokens.delete(token);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Password update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
