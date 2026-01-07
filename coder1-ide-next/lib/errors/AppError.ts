/**
 * Standardized Error Handling for Coder1 IDE API Routes
 *
 * Provides consistent error responses and success responses across all API endpoints.
 *
 * Usage in API routes:
 *   import { AppError, errorResponse, successResponse } from '@/lib/errors/AppError';
 *
 *   // Success response
 *   return successResponse({ sessions: [...] });
 *
 *   // Error response
 *   throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
 *
 *   // In catch block
 *   catch (error) {
 *     return handleApiError(error);
 *   }
 */

import { NextResponse } from 'next/server';

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  BAD_REQUEST: 'BAD_REQUEST',

  // Session errors
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_CREATION_FAILED: 'SESSION_CREATION_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Checkpoint errors
  CHECKPOINT_NOT_FOUND: 'CHECKPOINT_NOT_FOUND',
  CHECKPOINT_CREATION_FAILED: 'CHECKPOINT_CREATION_FAILED',
  CHECKPOINT_RESTORE_FAILED: 'CHECKPOINT_RESTORE_FAILED',

  // Terminal errors
  TERMINAL_CONNECTION_FAILED: 'TERMINAL_CONNECTION_FAILED',
  TERMINAL_SESSION_NOT_FOUND: 'TERMINAL_SESSION_NOT_FOUND',
  TERMINAL_COMMAND_FAILED: 'TERMINAL_COMMAND_FAILED',

  // Claude/AI errors
  CLAUDE_API_ERROR: 'CLAUDE_API_ERROR',
  CLAUDE_RATE_LIMITED: 'CLAUDE_RATE_LIMITED',
  CLAUDE_UNAVAILABLE: 'CLAUDE_UNAVAILABLE',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',

  // File errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',

  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// Response Types
// ============================================================================

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: ErrorCode;
    details?: unknown;
  };
  timestamp: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// AppError Class
// ============================================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: ErrorCode,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to API response format
   */
  toResponse(): ApiErrorResponse {
    return {
      success: false,
      error: {
        message: this.message,
        ...(this.code && { code: this.code }),
        ...(this.details && { details: this.details }),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Pre-defined Error Factories
// ============================================================================

export const Errors = {
  notFound: (resource: string, details?: unknown) =>
    new AppError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND, details),

  badRequest: (message: string, details?: unknown) =>
    new AppError(message, 400, ErrorCodes.BAD_REQUEST, details),

  validation: (message: string, details?: unknown) =>
    new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, details),

  unauthorized: (message = 'Unauthorized') =>
    new AppError(message, 401, ErrorCodes.UNAUTHORIZED),

  forbidden: (message = 'Forbidden') =>
    new AppError(message, 403, ErrorCodes.FORBIDDEN),

  rateLimited: (message = 'Too many requests') =>
    new AppError(message, 429, ErrorCodes.RATE_LIMITED),

  internal: (message = 'Internal server error', details?: unknown) =>
    new AppError(message, 500, ErrorCodes.INTERNAL_ERROR, details),

  // Domain-specific errors
  sessionNotFound: (sessionId: string) =>
    new AppError(`Session ${sessionId} not found`, 404, ErrorCodes.SESSION_NOT_FOUND),

  checkpointNotFound: (checkpointId: string) =>
    new AppError(`Checkpoint ${checkpointId} not found`, 404, ErrorCodes.CHECKPOINT_NOT_FOUND),

  claudeError: (message: string, details?: unknown) =>
    new AppError(message, 502, ErrorCodes.CLAUDE_API_ERROR, details),

  databaseError: (message: string, details?: unknown) =>
    new AppError(message, 500, ErrorCodes.DATABASE_ERROR, details),
};

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create a standardized error response from an AppError
 */
export function errorResponse(
  error: AppError
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(error.toResponse(), { status: error.statusCode });
}

/**
 * Handle any error and return appropriate response
 * Use this in catch blocks to handle both AppError and unknown errors
 */
export function handleApiError(
  error: unknown,
  defaultMessage = 'An unexpected error occurred'
): NextResponse<ApiErrorResponse> {
  // Log error for debugging
  console.error('[API Error]', error);

  // Handle AppError
  if (error instanceof AppError) {
    return errorResponse(error);
  }

  // Handle standard Error
  if (error instanceof Error) {
    const appError = new AppError(
      process.env.NODE_ENV === 'development' ? error.message : defaultMessage,
      500,
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
    );
    return errorResponse(appError);
  }

  // Handle unknown error type
  const appError = new AppError(defaultMessage, 500, ErrorCodes.INTERNAL_ERROR);
  return errorResponse(appError);
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Wrap an API handler with standardized error handling
 *
 * @example
 * export const GET = withErrorHandling(async (request) => {
 *   const data = await fetchData();
 *   return successResponse(data);
 * });
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as ApiErrorResponse).success === false
  );
}

export function isApiSuccessResponse<T>(response: unknown): response is ApiSuccessResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as ApiSuccessResponse<T>).success === true
  );
}
