/**
 * Global Error Handler System
 *
 * Provides centralized error handling with:
 * - Error categorization (network, validation, auth, server)
 * - User-friendly error messages
 * - Integration with Toast notifications
 * - Error logging and tracking
 */

import { logger } from './logger';

// Error Types
export type ErrorCategory = 'network' | 'validation' | 'auth' | 'server' | 'unknown';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  details?: string;
  timestamp: number;
  context?: Record<string, unknown>;
  stack?: string;
}

// Error event listeners
type ErrorListener = (error: AppError) => void;
const errorListeners: Set<ErrorListener> = new Set();

/**
 * Subscribe to error events (used by Toast system)
 */
export function onError(listener: ErrorListener): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

/**
 * Emit error to all listeners
 */
function emitError(error: AppError): void {
  errorListeners.forEach(listener => {
    try {
      listener(error);
    } catch (e) {
      console.error('Error in error listener:', e);
    }
  });
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Categorize error based on its characteristics
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (!error) return 'unknown';

  const errorObj = error as Error & { status?: number; code?: string };

  // Check for network errors
  if (
    errorObj.message?.includes('fetch') ||
    errorObj.message?.includes('network') ||
    errorObj.message?.includes('ECONNREFUSED') ||
    errorObj.message?.includes('Failed to fetch') ||
    errorObj.code === 'ENOTFOUND'
  ) {
    return 'network';
  }

  // Check for auth errors
  if (
    errorObj.status === 401 ||
    errorObj.status === 403 ||
    errorObj.message?.toLowerCase().includes('unauthorized') ||
    errorObj.message?.toLowerCase().includes('forbidden') ||
    errorObj.message?.toLowerCase().includes('authentication')
  ) {
    return 'auth';
  }

  // Check for validation errors
  if (
    errorObj.status === 400 ||
    errorObj.message?.toLowerCase().includes('validation') ||
    errorObj.message?.toLowerCase().includes('invalid') ||
    errorObj.message?.toLowerCase().includes('required')
  ) {
    return 'validation';
  }

  // Check for server errors
  if (
    errorObj.status && errorObj.status >= 500 ||
    errorObj.message?.toLowerCase().includes('server error') ||
    errorObj.message?.toLowerCase().includes('internal error')
  ) {
    return 'server';
  }

  return 'unknown';
}

/**
 * Get user-friendly message based on error category
 */
export function getUserFriendlyMessage(category: ErrorCategory, originalMessage?: string): string {
  const messages: Record<ErrorCategory, string> = {
    network: 'Connection error. Please check your internet connection and try again.',
    validation: originalMessage || 'Invalid input. Please check your data and try again.',
    auth: 'Authentication required. Please sign in and try again.',
    server: 'Server error. Our team has been notified. Please try again later.',
    unknown: 'An unexpected error occurred. Please try again.'
  };

  return messages[category];
}

/**
 * Get severity based on error category
 */
export function getSeverity(category: ErrorCategory, status?: number): ErrorSeverity {
  if (status && status >= 500) return 'critical';

  const severities: Record<ErrorCategory, ErrorSeverity> = {
    network: 'warning',
    validation: 'warning',
    auth: 'error',
    server: 'critical',
    unknown: 'error'
  };

  return severities[category];
}

/**
 * Main error handler - creates AppError and emits to listeners
 */
export function handleError(
  error: unknown,
  context?: Record<string, unknown>
): AppError {
  const errorObj = error as Error & { status?: number };
  const category = categorizeError(error);
  const severity = getSeverity(category, errorObj?.status);

  const appError: AppError = {
    id: generateErrorId(),
    category,
    severity,
    message: errorObj?.message || 'Unknown error',
    userMessage: getUserFriendlyMessage(category, errorObj?.message),
    details: errorObj?.stack,
    timestamp: Date.now(),
    context,
    stack: errorObj?.stack
  };

  // Log the error
  logger.error(`[${category.toUpperCase()}] ${appError.message}`, {
    errorId: appError.id,
    context
  });

  // Emit to listeners (Toast system will pick this up)
  emitError(appError);

  return appError;
}

/**
 * Handle API response errors
 */
export async function handleApiError(response: Response, context?: Record<string, unknown>): Promise<AppError> {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

  try {
    const body = await response.json();
    if (body.error) {
      errorMessage = body.error;
    } else if (body.message) {
      errorMessage = body.message;
    }
  } catch {
    // Response body not JSON, use status text
  }

  const error = new Error(errorMessage) as Error & { status: number };
  error.status = response.status;

  return handleError(error, { ...context, url: response.url, status: response.status });
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Create error manually (for custom errors)
 */
export function createError(
  message: string,
  category: ErrorCategory = 'unknown',
  severity: ErrorSeverity = 'error',
  context?: Record<string, unknown>
): AppError {
  const appError: AppError = {
    id: generateErrorId(),
    category,
    severity,
    message,
    userMessage: getUserFriendlyMessage(category, message),
    timestamp: Date.now(),
    context
  };

  emitError(appError);
  return appError;
}

/**
 * Shorthand for common error types
 */
export const errors = {
  network: (message?: string, context?: Record<string, unknown>) =>
    createError(message || 'Network error', 'network', 'warning', context),

  validation: (message: string, context?: Record<string, unknown>) =>
    createError(message, 'validation', 'warning', context),

  auth: (message?: string, context?: Record<string, unknown>) =>
    createError(message || 'Authentication required', 'auth', 'error', context),

  server: (message?: string, context?: Record<string, unknown>) =>
    createError(message || 'Server error', 'server', 'critical', context),
};

export default {
  handleError,
  handleApiError,
  withErrorHandling,
  createError,
  onError,
  categorizeError,
  errors
};
