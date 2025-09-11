/**
 * Server-side API configuration for production deployments
 */

/**
 * Get the appropriate backend URL for API calls
 * Uses environment variables with smart defaults for production
 * 
 * ✅ CRITICAL FOR AI AGENTS: Unified server runs on port 3001
 * StatusBar buttons will break if this points to wrong port!
 */
export function getBackendUrl(): string {
  // In production, use the current domain
  if (process.env.NODE_ENV === 'production') {
    // Try Vercel URL first, then fallback to current domain
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      return `https://${vercelUrl}`;
    }
  }
  
  // Use environment variable if set (should be http://localhost:3001)
  if (process.env.EXPRESS_BACKEND_URL) {
    return process.env.EXPRESS_BACKEND_URL;
  }
  
  // Development fallback - MUST use port 3001 for unified server
  // ✅ UPDATED: Unified Next.js server with integrated backend on 3001
  return 'http://localhost:3001';
}

/**
 * Get the appropriate API base URL
 * For internal API routes within the same Next.js app
 */
export function getApiUrl(): string {
  // In production, use current domain
  if (process.env.NODE_ENV === 'production') {
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      return `https://${vercelUrl}`;
    }
  }
  
  // Use environment variable if set
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Development fallback - API routes run on same port as Next.js (3001)
  // ℹ️ Note: This is different from getBackendUrl() which points to Express (3000)
  return 'http://localhost:3001';
}

/**
 * Legacy support - use getBackendUrl() for new code
 */
export const EXPRESS_BACKEND_URL = getBackendUrl();

/**
 * Utility to check if we're in production
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Utility to check if we're in development
 */
export const isDevelopment = process.env.NODE_ENV === 'development';