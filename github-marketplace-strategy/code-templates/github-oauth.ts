/**
 * GitHub OAuth Implementation Template
 * Ready-to-use code for GitHub authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ============================================
// Configuration
// ============================================

export const GITHUB_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
  redirectUri: process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`
    : 'http://localhost:3001/api/auth/github/callback'
};

// ============================================
// Types
// ============================================

export interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface MarketplaceSubscription {
  hasSubscription: boolean;
  plan?: {
    name: string;
    price: number;
    seats: number;
  };
  nextBillingDate?: string;
}

// ============================================
// OAuth Flow Functions
// ============================================

/**
 * Generate GitHub OAuth URL with state for CSRF protection
 */
export function getGitHubOAuthURL(): string {
  const state = crypto.randomBytes(16).toString('hex');
  
  const params = new URLSearchParams({
    client_id: GITHUB_CONFIG.clientId,
    redirect_uri: GITHUB_CONFIG.redirectUri,
    scope: 'user:email repo read:org',
    state: state,
    allow_signup: 'true'
  });
  
  // Store state in session for verification
  // You'll need to implement session storage
  // sessionStorage.setState(state);
  
  return `https://github.com/login/oauth/authorize?${params}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string
): Promise<GitHubTokenResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_CONFIG.clientId,
      client_secret: GITHUB_CONFIG.clientSecret,
      code,
      redirect_uri: GITHUB_CONFIG.redirectUri
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }
  
  return response.json();
}

/**
 * Get GitHub user information
 */
export async function getGitHubUser(
  accessToken: string
): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user information');
  }
  
  return response.json();
}

/**
 * Get user's primary email if not public
 */
export async function getGitHubUserEmails(
  accessToken: string
): Promise<string | null> {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!response.ok) {
    return null;
  }
  
  const emails = await response.json();
  const primary = emails.find((e: any) => e.primary && e.verified);
  return primary?.email || null;
}

// ============================================
// Marketplace Functions
// ============================================

/**
 * Check GitHub Marketplace subscription status
 */
export async function checkMarketplaceSubscription(
  accessToken: string,
  username: string
): Promise<MarketplaceSubscription> {
  try {
    const response = await fetch(
      `https://api.github.com/marketplace_listing/accounts/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (response.status === 404) {
      return { hasSubscription: false };
    }
    
    const data = await response.json();
    
    return {
      hasSubscription: true,
      plan: {
        name: data.marketplace_purchase.plan.name,
        price: data.marketplace_purchase.plan.monthly_price_in_cents / 100,
        seats: data.marketplace_purchase.plan.seats || 1
      },
      nextBillingDate: data.marketplace_purchase.next_billing_date
    };
  } catch (error) {
    console.error('Marketplace check error:', error);
    return { hasSubscription: false };
  }
}

// ============================================
// JWT Session Management
// ============================================

/**
 * Create JWT session token
 */
export function createSessionToken(user: GitHubUser): string {
  return jwt.sign(
    {
      id: user.id,
      login: user.login,
      email: user.email,
      avatar_url: user.avatar_url
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: '7d',
      issuer: 'coder1.dev'
    }
  );
}

/**
 * Verify and decode session token
 */
export function verifySessionToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'coder1.dev'
    });
  } catch (error) {
    throw new Error('Invalid session token');
  }
}

// ============================================
// Webhook Verification
// ============================================

/**
 * Verify GitHub webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const hmac = crypto.createHmac('sha256', GITHUB_CONFIG.webhookSecret);
  hmac.update(payload);
  const digest = 'sha256=' + hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// ============================================
// API Route Handlers
// ============================================

/**
 * /api/auth/github - Initiate OAuth flow
 */
export async function GET() {
  const authUrl = getGitHubOAuthURL();
  return NextResponse.redirect(authUrl);
}

/**
 * /api/auth/github/callback - Handle OAuth callback
 */
export async function handleCallback(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code) {
    return NextResponse.json(
      { error: 'Missing authorization code' },
      { status: 400 }
    );
  }
  
  // Verify state to prevent CSRF
  // const savedState = sessionStorage.getState();
  // if (state !== savedState) {
  //   return NextResponse.json(
  //     { error: 'Invalid state parameter' },
  //     { status: 400 }
  //   );
  // }
  
  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);
    
    // Get user information
    const user = await getGitHubUser(tokenData.access_token);
    
    // Get email if not public
    if (!user.email) {
      user.email = await getGitHubUserEmails(tokenData.access_token);
    }
    
    // Check marketplace subscription
    const subscription = await checkMarketplaceSubscription(
      tokenData.access_token,
      user.login
    );
    
    // Create session
    const sessionToken = createSessionToken(user);
    
    // Store user data in database
    // await saveUser(user, subscription);
    
    // Set cookie and redirect
    const response = NextResponse.redirect('/ide');
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// ============================================
// Middleware
// ============================================

/**
 * Protect API routes with authentication
 */
export async function requireAuth(request: NextRequest) {
  const session = request.cookies.get('session');
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  try {
    const user = verifySessionToken(session.value);
    return user;
  } catch (error) {
    throw new Error('Invalid session');
  }
}

/**
 * Require Pro subscription
 */
export async function requireProSubscription(user: any) {
  const subscription = await checkMarketplaceSubscription(
    user.accessToken,
    user.login
  );
  
  if (!subscription.hasSubscription || subscription.plan?.name !== 'Pro') {
    throw new Error('Pro subscription required');
  }
  
  return subscription;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Import GitHub repository
 */
export async function importGitHubRepo(
  repoUrl: string,
  accessToken: string
): Promise<string> {
  const [owner, repo] = repoUrl.split('/').slice(-2);
  
  // Clone repository
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to access repository');
  }
  
  const repoData = await response.json();
  
  // Create project in database
  // const projectId = await createProject(repoData);
  
  // Clone files
  // await cloneRepository(repoData.clone_url, projectId);
  
  return 'project-id'; // Return actual project ID
}

/**
 * List user's repositories
 */
export async function listUserRepos(
  accessToken: string,
  page = 1,
  perPage = 30
) {
  const response = await fetch(
    `https://api.github.com/user/repos?page=${page}&per_page=${perPage}&sort=updated`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }
  
  return response.json();
}

// ============================================
// Export for use in API routes
// ============================================

export default {
  getGitHubOAuthURL,
  exchangeCodeForToken,
  getGitHubUser,
  getGitHubUserEmails,
  checkMarketplaceSubscription,
  createSessionToken,
  verifySessionToken,
  verifyWebhookSignature,
  requireAuth,
  requireProSubscription,
  importGitHubRepo,
  listUserRepos
};