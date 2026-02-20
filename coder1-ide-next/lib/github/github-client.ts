/**
 * GitHub GraphQL API Client
 * Wraps GitHub's GraphQL API with rate limiting, error handling, and typed responses.
 * All GitHub API calls should go through this client to centralize token management.
 */

import type { GitHubGraphQLResponse } from '@/types/vcs';
import { decryptToken, isEncryptedToken } from '@/lib/auth/token-encryption';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  limit: number;
}

let rateLimitInfo: RateLimitInfo | null = null;

/**
 * Get a decrypted GitHub VCS token for a user.
 * Retrieves the token from the oauth_accounts table and decrypts it.
 */
export async function getVCSToken(userId: string): Promise<string | null> {
  try {
    const { getAuthDatabase } = await import('@/lib/auth/db');
    const db = getAuthDatabase();

    const row = db.prepare(
      `SELECT access_token FROM oauth_accounts WHERE user_id = ? AND provider = 'github-vcs'`
    ).get(userId) as { access_token: string } | undefined;

    if (!row?.access_token) return null;

    // Decrypt if encrypted, return as-is if plain (legacy)
    if (isEncryptedToken(row.access_token)) {
      return decryptToken(row.access_token);
    }
    return row.access_token;
  } catch (err) {
    console.error('[GitHubClient] Failed to get VCS token:', err);
    return null;
  }
}

/**
 * Execute a GitHub GraphQL query with proper auth and error handling.
 */
export async function githubGraphQL<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<GitHubGraphQLResponse<T>> {
  // Check rate limit before making request
  if (rateLimitInfo && rateLimitInfo.remaining < 10) {
    const now = new Date();
    if (now < rateLimitInfo.resetAt) {
      throw new Error(
        `GitHub API rate limit nearly exhausted (${rateLimitInfo.remaining} remaining). Resets at ${rateLimitInfo.resetAt.toISOString()}`
      );
    }
  }

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  // Update rate limit tracking from response headers
  const remaining = response.headers.get('x-ratelimit-remaining');
  const resetTimestamp = response.headers.get('x-ratelimit-reset');
  const limit = response.headers.get('x-ratelimit-limit');
  if (remaining && resetTimestamp) {
    rateLimitInfo = {
      remaining: parseInt(remaining, 10),
      resetAt: new Date(parseInt(resetTimestamp, 10) * 1000),
      limit: limit ? parseInt(limit, 10) : 5000,
    };
  }

  if (response.status === 401) {
    throw new Error('GITHUB_TOKEN_EXPIRED');
  }

  if (response.status === 403) {
    const ssoHeader = response.headers.get('x-github-sso');
    if (ssoHeader) {
      throw new Error('GITHUB_SSO_REQUIRED');
    }
    throw new Error('GITHUB_FORBIDDEN');
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as GitHubGraphQLResponse<T>;

  if (data.errors && data.errors.length > 0) {
    const errorMessages = data.errors.map(e => e.message).join('; ');
    console.warn('[GitHubClient] GraphQL errors:', errorMessages);
  }

  return data;
}

/**
 * Execute a GitHub REST API call (for operations not available via GraphQL).
 */
export async function githubREST<T>(
  token: string,
  path: string,
  options?: {
    method?: string;
    body?: unknown;
  }
): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options?.method || 'GET',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    throw new Error('GITHUB_TOKEN_EXPIRED');
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub REST API error: ${response.status} - ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get current rate limit info (if available from previous requests).
 */
export function getRateLimitInfo(): RateLimitInfo | null {
  return rateLimitInfo;
}
