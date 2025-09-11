/**
 * Rate Limiter for API Routes
 * Implements a simple in-memory sliding window rate limiter
 */

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  message?: string;      // Custom error message
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean;     // Only count successful requests
}

interface RateLimitEntry {
  requests: number[];    // Timestamps of requests
  resetTime: number;     // When the window resets
}

class RateLimiter {
  private static instances = new Map<string, RateLimiter>();
  private store = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;

  private constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      message: config.message || 'Too many requests, please try again later.',
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false
    };

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  public static getInstance(name: string, config: RateLimitConfig): RateLimiter {
    if (!RateLimiter.instances.has(name)) {
      RateLimiter.instances.set(name, new RateLimiter(config));
    }
    return RateLimiter.instances.get(name)!;
  }

  private defaultKeyGenerator(req: Request): string {
    // Try to get IP from headers (for reverse proxy setups)
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    // Include URL path for per-endpoint limiting
    const url = new URL(req.url);
    return `${ip}:${url.pathname}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  public async limit(req: Request): Promise<{ success: boolean; response?: Response }> {
    const now = Date.now();
    const key = this.config.keyGenerator(req);
    
    // Get or create entry
    let entry = this.store.get(key);
    if (!entry || entry.resetTime < now) {
      entry = {
        requests: [],
        resetTime: now + this.config.windowMs
      };
      this.store.set(key, entry);
    }

    // Clean old requests from sliding window
    const windowStart = now - this.config.windowMs;
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (entry.requests.length >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return {
        success: false,
        response: new Response(
          JSON.stringify({
            error: this.config.message,
            retryAfter,
            limit: this.config.maxRequests,
            windowMs: this.config.windowMs
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': this.config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': entry.resetTime.toString()
            }
          }
        )
      };
    }

    // Add current request
    entry.requests.push(now);
    
    // Update headers for successful requests
    const remaining = this.config.maxRequests - entry.requests.length;
    
    return {
      success: true,
      response: new Response(null, {
        headers: {
          'X-RateLimit-Limit': this.config.maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': entry.resetTime.toString()
        }
      })
    };
  }

  public getStats(key?: string): any {
    if (key) {
      const entry = this.store.get(key);
      return entry ? {
        requests: entry.requests.length,
        resetTime: entry.resetTime,
        remaining: this.config.maxRequests - entry.requests.length
      } : null;
    }

    return {
      totalKeys: this.store.size,
      config: this.config
    };
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // General API endpoints
  general: RateLimiter.getInstance('general', {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,          // 100 requests per 15 minutes
    message: 'Too many requests. Limit: 100 requests per 15 minutes.'
  }),

  // AI/Claude endpoints (more restrictive)
  ai: RateLimiter.getInstance('ai', {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,           // 10 requests per minute
    message: 'AI endpoint rate limit exceeded. Limit: 10 requests per minute.'
  }),

  // Authentication endpoints (very restrictive)
  auth: RateLimiter.getInstance('auth', {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,            // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Try again in 15 minutes.'
  }),

  // File operations (moderate)
  files: RateLimiter.getInstance('files', {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,           // 30 requests per minute
    message: 'File operation rate limit exceeded. Limit: 30 requests per minute.'
  }),

  // Terminal/sandbox operations (moderate)
  terminal: RateLimiter.getInstance('terminal', {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 20,           // 20 requests per minute
    message: 'Terminal rate limit exceeded. Limit: 20 requests per minute.'
  })
};

// Middleware helper for Next.js API routes
export function withRateLimit(limiter: RateLimiter) {
  return async function(req: Request, next: () => Promise<Response>): Promise<Response> {
    const result = await limiter.limit(req);
    
    if (!result.success) {
      return result.response!;
    }

    // Execute the actual handler
    const response = await next();
    
    // Merge rate limit headers with response
    const rateLimitHeaders = result.response!.headers;
    for (const [key, value] of rateLimitHeaders.entries()) {
      response.headers.set(key, value);
    }
    
    return response;
  };
}

export default RateLimiter;