import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// Get secret from environment or generate a secure one
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || randomBytes(32).toString('hex');

// Token expiration times
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

// Log warning in development if using generated secrets
if (process.env.NODE_ENV === 'development' && !process.env.JWT_SECRET) {
  logger?.warn('⚠️  Using generated JWT secret. Set JWT_SECRET in .env for production');
}

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  subscriptionTier: string;
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

/**
 * Generate access and refresh tokens for a user
 */
export function generateTokens(payload: TokenPayload): {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
  
  // Calculate expiration date for access token
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  
  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (error) {
    return null;
  }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as DecodedToken;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a new access token from a refresh token
 */
export function refreshAccessToken(refreshToken: string): {
  accessToken: string;
  expiresAt: Date;
} | null {
  const decoded = verifyRefreshToken(refreshToken);
  
  if (!decoded) {
    return null;
  }
  
  // Create new payload without iat and exp
  const payload: TokenPayload = {
    userId: decoded.userId,
    email: decoded.email,
    username: decoded.username,
    subscriptionTier: decoded.subscriptionTier,
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  
  return {
    accessToken,
    expiresAt,
  };
}

/**
 * Generate a secure random token for email verification, password reset, etc.
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}