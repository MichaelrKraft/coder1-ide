/**
 * Google OAuth Configuration
 * Handles Google authentication flow
 */

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
  sub: string; // Google unique ID
}

export const GOOGLE_OAUTH_CONFIG = {
  // These will come from environment variables
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/v2/auth/google/callback`
    : 'http://localhost:3001/api/v2/auth/google/callback',
};

/**
 * Generate Google OAuth URL for login
 */
export function getGoogleOAuthURL(): string {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  
  const options = {
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function getGoogleTokens(code: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  id_token: string;
}> {
  const url = 'https://oauth2.googleapis.com/token';
  
  const values = {
    code,
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    grant_type: 'authorization_code',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(values),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Google authorization code');
  }

  return response.json();
}

/**
 * Get Google user info from access token
 */
export async function getGoogleUser(accessToken: string): Promise<GoogleUser> {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Google user');
  }

  const data = await response.json();
  
  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
    email_verified: data.verified_email,
    sub: data.id,
  };
}