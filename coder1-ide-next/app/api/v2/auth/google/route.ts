import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthURL } from '@/lib/auth/google-oauth';

/**
 * GET /api/v2/auth/google
 * Redirects to Google OAuth consent screen
 */
export async function GET(request: NextRequest) {
  try {
    const url = getGoogleOAuthURL();
    return NextResponse.redirect(url);
  } catch (error) {
    // logger?.error('Error generating Google OAuth URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}