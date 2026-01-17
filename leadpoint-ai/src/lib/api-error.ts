// Custom API Error class for consistent error handling

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static fromResponse(response: Response, body?: { error?: { message?: string; code?: string } }) {
    const message = body?.error?.message || getDefaultErrorMessage(response.status)
    const code = body?.error?.code || getErrorCode(response.status)
    return new ApiError(message, response.status, code)
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
    }
  }
}

// Convert unknown errors to ApiError
export function handleApiError(error: unknown): ApiError {
  // Already an ApiError
  if (ApiError.isApiError(error)) {
    return error
  }

  // Standard Error
  if (error instanceof Error) {
    // Network error
    if (error.message === 'Failed to fetch' || error.message.includes('network')) {
      return new ApiError(
        'Network error. Please check your connection and try again.',
        0,
        'NETWORK_ERROR'
      )
    }

    // Timeout error
    if (error.message.includes('timeout')) {
      return new ApiError(
        'Request timed out. Please try again.',
        408,
        'TIMEOUT_ERROR'
      )
    }

    // Generic error
    return new ApiError(error.message, 500, 'UNKNOWN_ERROR')
  }

  // Unknown error type
  return new ApiError(
    'An unexpected error occurred. Please try again.',
    500,
    'UNKNOWN_ERROR'
  )
}

// Get user-friendly error message from error
export function getErrorMessage(error: unknown): string {
  if (ApiError.isApiError(error)) {
    return error.message
  }

  if (error instanceof Error) {
    // Don't expose internal error messages in production
    if (process.env.NODE_ENV === 'production') {
      return 'An error occurred. Please try again.'
    }
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred.'
}

// Get default error message based on status code
function getDefaultErrorMessage(statusCode: number): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Please sign in to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    408: 'Request timed out. Please try again.',
    409: 'A conflict occurred. The resource may have been modified.',
    422: 'The provided data is invalid.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Gateway timeout. Please try again later.',
  }

  return messages[statusCode] || 'An error occurred. Please try again.'
}

// Get error code based on status code
function getErrorCode(statusCode: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    408: 'TIMEOUT',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT',
  }

  return codes[statusCode] || 'UNKNOWN_ERROR'
}

// Consistent API response types
export interface ApiResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  error: {
    message: string
    code?: string
    details?: Record<string, unknown>
  }
}

// Type guard for API error response
export function isApiErrorResponse(
  response: unknown
): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'object'
  )
}

// Fetch wrapper with error handling
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      throw ApiError.fromResponse(response, body)
    }

    // Return data directly or wrapped response
    return body?.data ?? body
  } catch (error) {
    throw handleApiError(error)
  }
}

// Retry wrapper for flaky operations
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    shouldRetry?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, shouldRetry } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      const apiError = handleApiError(error)
      const isRetryable =
        shouldRetry?.(error) ??
        [0, 408, 429, 500, 502, 503, 504].includes(apiError.statusCode)

      if (!isRetryable || attempt === retries) {
        throw error
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt))
      )
    }
  }

  throw lastError
}
