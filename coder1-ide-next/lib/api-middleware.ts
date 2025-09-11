/**
 * API Middleware for Next.js Route Handlers
 * Provides rate limiting, validation, logging, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, withRateLimit } from './rate-limiter';
import { logger } from './logger';

// Middleware configuration
export interface APIMiddlewareConfig {
  rateLimit?: 'general' | 'ai' | 'auth' | 'files' | 'terminal' | false;
  requireAuth?: boolean;
  validateBody?: boolean;
  logRequests?: boolean;
}

// Request context passed to handlers
export interface APIContext {
  req: NextRequest;
  params?: any;
  user?: any; // Set if authentication is enabled
}

// Enhanced handler type
export type APIHandler = (context: APIContext) => Promise<NextResponse>;

/**
 * Wraps a Next.js API route handler with middleware
 */
export function withAPIMiddleware(
  handler: APIHandler,
  config: APIMiddlewareConfig = {}
) {
  return async function(
    req: NextRequest,
    { params }: { params?: any } = {}
  ): Promise<NextResponse> {
    
    const startTime = Date.now();
    const context: APIContext = { req, params };

    try {
      // 1. Request Logging
      if (config.logRequests !== false) {
        logger.info(`API Request: ${req.method} ${req.nextUrl.pathname}`);
      }

      // 2. Rate Limiting
      if (config.rateLimit && typeof config.rateLimit === 'string') {
        const limiter = rateLimiters[config.rateLimit];
        const rateLimitResult = await limiter.limit(req);
        
        if (!rateLimitResult.success) {
          return rateLimitResult.response! as NextResponse;
        }
      }

      // 3. Authentication (if required)
      if (config.requireAuth) {
        const authResult = await validateAuth(req);
        if (!authResult.success) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
        context.user = authResult.user;
      }

      // 4. Body Validation (for POST/PUT requests)
      if (config.validateBody && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const bodyValidation = await validateRequestBody(req);
        if (!bodyValidation.success) {
          return NextResponse.json(
            { error: 'Invalid request body', details: bodyValidation.errors },
            { status: 400 }
          );
        }
      }

      // 5. Execute Handler
      const response = await handler(context);

      // 6. Add Rate Limit Headers (if rate limiting was applied)
      if (config.rateLimit && typeof config.rateLimit === 'string') {
        const limiter = rateLimiters[config.rateLimit];
        const key = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
        const stats = limiter.getStats(`${key}:${req.nextUrl.pathname}`);
        
        if (stats) {
          response.headers.set('X-RateLimit-Limit', limiter.getStats().config.maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', stats.remaining.toString());
          response.headers.set('X-RateLimit-Reset', stats.resetTime.toString());
        }
      }

      // 7. Performance Logging
      const duration = Date.now() - startTime;
      if (config.logRequests !== false) {
        logger.apiLog(req.method, req.nextUrl.pathname, response.status, duration);
      }

      return response;

    } catch (error: any) {
      // Error Handling with proper logging
      const duration = Date.now() - startTime;
      logger.error(`API Error: ${req.method} ${req.nextUrl.pathname}`, error);
      logger.apiLog(req.method, req.nextUrl.pathname, 500, duration, error);
      
      // Don't expose internal errors in production
      const isProduction = process.env.NODE_ENV === 'production';
      const errorMessage = isProduction ? 'Internal server error' : error.message;
      
      return NextResponse.json(
        {
          error: errorMessage,
          ...(isProduction ? {} : { 
            stack: error.stack,
            timestamp: new Date().toISOString()
          })
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Authentication validation
 */
async function validateAuth(req: NextRequest): Promise<{ success: boolean; user?: any }> {
  try {
    // Check for Bearer token
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header');
      return { success: false };
    }

    const token = authorization.slice(7);
    
    // Enhanced token validation
    if (!token || token === 'null' || token === 'undefined' || token.length < 10) {
      logger.warn('Invalid or empty token');
      return { success: false };
    }

    // For alpha launch: Simple token validation
    // Production should use JWT with proper signing and expiration
    if (token === process.env.CODER1_ALPHA_TOKEN || token.startsWith('coder1-alpha-')) {
      return {
        success: true,
        user: { id: 'alpha-user', name: 'Alpha User', tier: 'alpha' }
      };
    }

    // Check for session-based auth as fallback
    const sessionToken = req.cookies.get('coder1-session')?.value;
    if (sessionToken && isValidSessionToken(sessionToken)) {
      return {
        success: true,
        user: { id: 'session-user', name: 'Session User', tier: 'free' }
      };
    }

    logger.warn(`Invalid token attempt: ${token.substring(0, 10)}...`);
    return { success: false };

  } catch (error) {
    logger.error('Authentication error:', error);
    return { success: false };
  }
}

/**
 * Validate session token (simple implementation for alpha)
 */
function isValidSessionToken(sessionToken: string): boolean {
  // For alpha: Accept any session token that looks valid
  // Production should validate against database or JWT
  return !!(sessionToken && sessionToken.length >= 20 && sessionToken.includes('-'));
}

/**
 * Request body validation
 */
async function validateRequestBody(req: NextRequest): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const contentType = req.headers.get('content-type');
    
    // Check content type
    if (!contentType?.includes('application/json')) {
      return {
        success: false,
        errors: ['Content-Type must be application/json']
      };
    }

    // Try to parse JSON
    const body = await req.text();
    if (body.trim() === '') {
      return {
        success: false,
        errors: ['Request body is required']
      };
    }

    JSON.parse(body);
    
    return { success: true };

  } catch (error: any) {
    return {
      success: false,
      errors: [`Invalid JSON: ${error.message}`]
    };
  }
}

/**
 * Quick middleware factories for common use cases
 */

// AI/Claude endpoints
export const withAIMiddleware = (handler: APIHandler) => withAPIMiddleware(handler, {
  rateLimit: 'ai',
  logRequests: true,
  validateBody: true
});

// File operation endpoints - REQUIRES AUTHENTICATION for security
export const withFileMiddleware = (handler: APIHandler) => withAPIMiddleware(handler, {
  rateLimit: 'files',
  requireAuth: true,
  logRequests: true,
  validateBody: false // Files may not always send JSON body
});

// Authentication endpoints
export const withAuthMiddleware = (handler: APIHandler) => withAPIMiddleware(handler, {
  rateLimit: 'auth',
  logRequests: true,
  validateBody: true
});

// Terminal/container endpoints
export const withTerminalMiddleware = (handler: APIHandler) => withAPIMiddleware(handler, {
  rateLimit: 'terminal',
  logRequests: true
});

// General API endpoints
export const withGeneralMiddleware = (handler: APIHandler) => withAPIMiddleware(handler, {
  rateLimit: 'general',
  logRequests: true
});

export default withAPIMiddleware;