/**
 * Rate Limiting Utility for API Endpoints
 *
 * Uses in-memory sliding window algorithm with subscription tier-based limits.
 * Designed to protect expensive AI endpoints from abuse.
 */

import { NextResponse } from 'next/server'
import type { SubscriptionPlan } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Window duration in milliseconds */
  windowMs: number
  /** Maximum requests per window, keyed by subscription plan */
  maxRequests: Record<SubscriptionPlan, number>
  /** Optional identifier for this limiter (for logging) */
  name?: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of requests remaining in current window */
  remaining: number
  /** Total limit for the user's plan */
  limit: number
  /** When the current window resets (ISO timestamp) */
  resetAt: Date
  /** Seconds until the window resets */
  retryAfterSeconds: number
}

interface WindowEntry {
  /** Timestamps of requests in the current window */
  timestamps: number[]
  /** Last cleanup time to prevent memory bloat */
  lastCleanup: number
}

// ============================================================================
// Default Configurations
// ============================================================================

/** Per-minute limits by subscription tier */
export const MINUTE_LIMITS: Record<SubscriptionPlan, number> = {
  free: 10,
  starter: 30,
  growth: 60,
  scale: 120,
}

/** Per-hour limits by subscription tier */
export const HOURLY_LIMITS: Record<SubscriptionPlan, number> = {
  free: 100,
  starter: 500,
  growth: 1000,
  scale: 2000,
}

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter {
  private store: Map<string, WindowEntry> = new Map()
  private config: RateLimitConfig
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(config: RateLimitConfig) {
    this.config = config
    // Start periodic cleanup to prevent memory leaks
    this.startCleanupInterval()
  }

  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (e.g., userId, orgId, or IP)
   * @param plan - User's subscription plan (defaults to 'free' for strictest limits)
   */
  check(identifier: string, plan: SubscriptionPlan = 'free'): RateLimitResult {
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    const limit = this.config.maxRequests[plan]

    // Get or create entry for this identifier
    let entry = this.store.get(identifier)
    if (!entry) {
      entry = { timestamps: [], lastCleanup: now }
      this.store.set(identifier, entry)
    }

    // Filter timestamps to only include those in the current window
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

    // Calculate result
    const currentCount = entry.timestamps.length
    const allowed = currentCount < limit
    const remaining = Math.max(0, limit - currentCount - (allowed ? 1 : 0))

    // Calculate when the oldest request in window will expire
    const oldestTimestamp = entry.timestamps[0] || now
    const resetAt = new Date(oldestTimestamp + this.config.windowMs)
    const retryAfterSeconds = Math.ceil((resetAt.getTime() - now) / 1000)

    // If allowed, add current request timestamp
    if (allowed) {
      entry.timestamps.push(now)
    }

    return {
      allowed,
      remaining,
      limit,
      resetAt,
      retryAfterSeconds: Math.max(0, retryAfterSeconds),
    }
  }

  /**
   * Start periodic cleanup to remove expired entries
   */
  private startCleanupInterval(): void {
    // Clean up every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)

    // Ensure the interval doesn't prevent Node from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Remove expired entries from the store
   */
  private cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    const identifiersToDelete: string[] = []

    this.store.forEach((entry, identifier) => {
      // Filter out expired timestamps
      entry.timestamps = entry.timestamps.filter((ts: number) => ts > windowStart)

      // Mark entry for removal if no recent requests
      if (entry.timestamps.length === 0) {
        identifiersToDelete.push(identifier)
      }
    })

    // Delete after iteration to avoid modifying during iteration
    identifiersToDelete.forEach(id => this.store.delete(id))
  }

  /**
   * Stop the cleanup interval (for testing/shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Get current store size (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear()
  }
}

// ============================================================================
// Pre-configured Rate Limiters
// ============================================================================

/**
 * Rate limiter for AI generation endpoints (per minute)
 * Most expensive operations - strictest per-minute limits
 */
export const aiGenerationLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: MINUTE_LIMITS,
  name: 'ai-generation-minute',
})

/**
 * Rate limiter for AI generation endpoints (per hour)
 * Hourly cap to prevent sustained abuse
 */
export const aiGenerationHourlyLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: HOURLY_LIMITS,
  name: 'ai-generation-hourly',
})

/**
 * Rate limiter for discovery endpoints (per minute)
 * Apify calls are expensive
 */
export const discoveryLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: MINUTE_LIMITS,
  name: 'discovery-minute',
})

/**
 * Rate limiter for discovery endpoints (per hour)
 */
export const discoveryHourlyLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: HOURLY_LIMITS,
  name: 'discovery-hourly',
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a rate limiter with custom configuration
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config)
}

/**
 * Check both minute and hourly limits for a user
 * Returns the more restrictive result
 */
export function checkRateLimits(
  minuteLimiter: RateLimiter,
  hourlyLimiter: RateLimiter,
  identifier: string,
  plan: SubscriptionPlan = 'free'
): RateLimitResult {
  const minuteResult = minuteLimiter.check(identifier, plan)

  // If minute limit exceeded, return that result
  if (!minuteResult.allowed) {
    return minuteResult
  }

  // Check hourly limit
  const hourlyResult = hourlyLimiter.check(identifier, plan)

  // If hourly limit exceeded, return that result
  if (!hourlyResult.allowed) {
    return hourlyResult
  }

  // Both passed - return the minute result (shows per-minute remaining)
  // but use the lower remaining count between the two
  return {
    ...minuteResult,
    remaining: Math.min(minuteResult.remaining, hourlyResult.remaining),
  }
}

/**
 * Build rate limit headers for response
 */
export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
    ...(result.allowed ? {} : { 'Retry-After': result.retryAfterSeconds.toString() }),
  }
}

/**
 * Create a 429 Too Many Requests response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      data: null,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait before trying again.',
        status: 429,
        details: {
          limit: result.limit,
          remaining: result.remaining,
          resetAt: result.resetAt.toISOString(),
          retryAfterSeconds: result.retryAfterSeconds,
        },
      },
    },
    {
      status: 429,
      headers: buildRateLimitHeaders(result),
    }
  )
}

/**
 * Add rate limit headers to an existing response
 */
export function withRateLimitHeaders<T>(
  response: NextResponse<T>,
  result: RateLimitResult
): NextResponse<T> {
  const headers = buildRateLimitHeaders(result)
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

// ============================================================================
// Convenience function for API routes
// ============================================================================

/**
 * Combined rate limit check for AI endpoints
 * Uses both minute and hourly limiters
 *
 * @example
 * const rateLimitResult = checkAIRateLimit(userId, subscriptionPlan)
 * if (!rateLimitResult.allowed) {
 *   return rateLimitResponse(rateLimitResult)
 * }
 */
export function checkAIRateLimit(
  identifier: string,
  plan: SubscriptionPlan = 'free'
): RateLimitResult {
  return checkRateLimits(
    aiGenerationLimiter,
    aiGenerationHourlyLimiter,
    identifier,
    plan
  )
}

/**
 * Combined rate limit check for discovery endpoints
 * Uses both minute and hourly limiters
 *
 * @example
 * const rateLimitResult = checkDiscoveryRateLimit(orgId, subscriptionPlan)
 * if (!rateLimitResult.allowed) {
 *   return rateLimitResponse(rateLimitResult)
 * }
 */
export function checkDiscoveryRateLimit(
  identifier: string,
  plan: SubscriptionPlan = 'free'
): RateLimitResult {
  return checkRateLimits(
    discoveryLimiter,
    discoveryHourlyLimiter,
    identifier,
    plan
  )
}
