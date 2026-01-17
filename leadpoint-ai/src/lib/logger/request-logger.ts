/**
 * Request Logger Utility
 *
 * Provides middleware-style logging for API requests and responses.
 * Tracks: method, path, status, duration, user ID (if authenticated)
 * Automatically redacts sensitive data (passwords, tokens, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger, type LogMetadata } from './index';

// ============================================================================
// Types
// ============================================================================

export interface RequestLogContext {
  /** Unique request ID for correlation */
  requestId: string;
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** User ID if authenticated */
  userId?: string;
  /** Organization ID if available */
  organizationId?: string;
  /** Request start time */
  startTime: number;
}

export interface RequestLogOptions {
  /** Include request body in logs (will be sanitized) */
  logBody?: boolean;
  /** Include query params in logs */
  logQuery?: boolean;
  /** Additional metadata to include */
  metadata?: LogMetadata;
}

// ============================================================================
// Configuration
// ============================================================================

const requestLogger = createLogger({ context: 'Request' });

// Fields to completely exclude from body logging
const EXCLUDED_BODY_FIELDS = new Set([
  'password',
  'confirmPassword',
  'confirm_password',
  'currentPassword',
  'current_password',
  'newPassword',
  'new_password',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'apiKey',
  'api_key',
  'secret',
  'secretKey',
  'secret_key',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
]);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Sanitize request body for logging
 */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map(item => sanitizeBody(item));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (EXCLUDED_BODY_FIELDS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Extract path from URL
 */
function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Extract query params as object
 */
function extractQueryParams(url: string): Record<string, string> | undefined {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      // Redact sensitive query params
      if (EXCLUDED_BODY_FIELDS.has(key)) {
        params[key] = '[REDACTED]';
      } else {
        params[key] = value;
      }
    });

    return Object.keys(params).length > 0 ? params : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// Request Logging Functions
// ============================================================================

/**
 * Start logging a request - call at the beginning of your route handler
 *
 * @example
 * const reqLog = logRequest(request);
 * // ... handle request ...
 * return logResponse(reqLog, response);
 */
export function logRequest(
  request: NextRequest,
  options: RequestLogOptions = {}
): RequestLogContext {
  const requestId = generateRequestId();
  const method = request.method;
  const path = extractPath(request.url);
  const startTime = Date.now();

  const logData: LogMetadata = {
    requestId,
    method,
    path,
  };

  // Add query params if requested
  if (options.logQuery) {
    const queryParams = extractQueryParams(request.url);
    if (queryParams) {
      logData.query = queryParams;
    }
  }

  // Add custom metadata
  if (options.metadata) {
    Object.assign(logData, options.metadata);
  }

  requestLogger.info('Request received', logData);

  return {
    requestId,
    method,
    path,
    startTime,
  };
}

/**
 * Log request with body - for POST/PUT/PATCH requests
 * Body will be automatically sanitized
 */
export async function logRequestWithBody(
  request: NextRequest,
  body: unknown,
  options: RequestLogOptions = {}
): Promise<RequestLogContext> {
  const context = logRequest(request, options);

  if (options.logBody !== false && body) {
    const sanitizedBody = sanitizeBody(body);
    requestLogger.debug('Request body', {
      requestId: context.requestId,
      body: sanitizedBody,
    });
  }

  return context;
}

/**
 * Log the response - call before returning from your route handler
 */
export function logResponse<T extends NextResponse>(
  context: RequestLogContext,
  response: T,
  options: { metadata?: LogMetadata } = {}
): T {
  const duration = Date.now() - context.startTime;
  const status = response.status;

  const logData: LogMetadata = {
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    status,
    duration: formatDuration(duration),
    durationMs: duration,
  };

  // Add user context if available
  if (context.userId) {
    logData.userId = context.userId;
  }
  if (context.organizationId) {
    logData.organizationId = context.organizationId;
  }

  // Add custom metadata
  if (options.metadata) {
    Object.assign(logData, options.metadata);
  }

  // Choose log level based on status
  if (status >= 500) {
    requestLogger.error('Request failed', logData);
  } else if (status >= 400) {
    requestLogger.warn('Request error', logData);
  } else {
    requestLogger.info('Request completed', logData);
  }

  return response;
}

/**
 * Log an error that occurred during request processing
 */
export function logRequestError(
  context: RequestLogContext,
  error: unknown,
  metadata?: LogMetadata
): void {
  const duration = Date.now() - context.startTime;

  const logData: LogMetadata = {
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    duration: formatDuration(duration),
    durationMs: duration,
    ...metadata,
  };

  if (context.userId) {
    logData.userId = context.userId;
  }

  requestLogger.error('Request error', logData, error);
}

/**
 * Add user context to request log
 */
export function addUserContext(
  context: RequestLogContext,
  userId?: string,
  organizationId?: string
): RequestLogContext {
  return {
    ...context,
    userId,
    organizationId,
  };
}

// ============================================================================
// Higher-Order Function for Wrapping Route Handlers
// ============================================================================

type RouteHandler = (request: NextRequest, context?: unknown) => Promise<NextResponse>;

/**
 * Wrap a route handler with automatic request/response logging
 *
 * @example
 * export const POST = withRequestLogging(async (request) => {
 *   // Your handler code
 *   return NextResponse.json({ data: 'result' });
 * });
 */
export function withRequestLogging(
  handler: RouteHandler,
  options: RequestLogOptions = {}
): RouteHandler {
  return async (request: NextRequest, routeContext?: unknown): Promise<NextResponse> => {
    const reqLog = logRequest(request, options);

    try {
      const response = await handler(request, routeContext);
      return logResponse(reqLog, response);
    } catch (error) {
      logRequestError(reqLog, error);
      throw error;
    }
  };
}

// ============================================================================
// Specialized Logging Functions
// ============================================================================

/**
 * Log an authentication attempt
 */
export function logAuthAttempt(
  context: RequestLogContext,
  success: boolean,
  method: 'login' | 'signup' | 'logout' | 'password_reset' | 'oauth',
  metadata?: LogMetadata
): void {
  const logger = createLogger({ context: 'Auth' });

  const logData: LogMetadata = {
    requestId: context.requestId,
    authMethod: method,
    success,
    ...metadata,
  };

  if (success) {
    logger.info(`Authentication ${method} successful`, logData);
  } else {
    logger.warn(`Authentication ${method} failed`, logData);
  }
}

/**
 * Log AI/expensive operation
 */
export function logAIOperation(
  context: RequestLogContext,
  operation: string,
  metadata: {
    model?: string;
    tokensUsed?: number;
    durationMs?: number;
    success: boolean;
    error?: string;
  }
): void {
  const logger = createLogger({ context: 'AI' });

  const logData: LogMetadata = {
    requestId: context.requestId,
    operation,
    ...metadata,
  };

  if (metadata.success) {
    logger.info(`AI operation completed: ${operation}`, logData);
  } else {
    logger.error(`AI operation failed: ${operation}`, logData);
  }
}

/**
 * Log database operation
 */
export function logDatabaseOperation(
  context: RequestLogContext,
  operation: 'query' | 'insert' | 'update' | 'delete',
  table: string,
  metadata?: LogMetadata
): void {
  const logger = createLogger({ context: 'Database' });

  logger.debug(`Database ${operation}`, {
    requestId: context.requestId,
    table,
    operation,
    ...metadata,
  });
}

// ============================================================================
// Exports
// ============================================================================

export {
  generateRequestId,
  sanitizeBody,
  formatDuration,
};
