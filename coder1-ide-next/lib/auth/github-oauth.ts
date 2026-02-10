/**
 * GitHub OAuth Configuration
 * Handles GitHub authentication flow
 */

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export const GITHUB_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v2/auth/github/callback`
    : 'http://localhost:3001/api/v2/auth/github/callback',
};

/**
 * Generate GitHub OAuth URL for login
 */
export function getGitHubOAuthURL(state: string): string {
  const rootUrl = 'https://github.com/login/oauth/authorize';

  const options = {
    client_id: GITHUB_OAUTH_CONFIG.clientId,
    redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
    scope: 'user:email',
    state,
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function getGitHubTokens(code: string): Promise<{ access_token: string }> {
  const url = 'https://github.com/login/oauth/access_token';

  const values = {
    client_id: GITHUB_OAUTH_CONFIG.clientId,
    client_secret: GITHUB_OAUTH_CONFIG.clientSecret,
    code,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange GitHub authorization code');
  }

  return response.json();
}

/**
 * Get GitHub user info from access token
 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user');
  }

  const data = await response.json();

  let email = data.email;

  // If email is null, fetch from /user/emails endpoint (edge case E2-1)
  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      const primary = emails.find((e: { primary: boolean; email: string }) => e.primary);
      if (primary) {
        email = primary.email;
      }
    }
  }

  return {
    id: data.id,
    login: data.login,
    name: data.name,
    email,
    avatar_url: data.avatar_url,
  };
}
