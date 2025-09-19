const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class SecurityManager {
  constructor(options) {
    this.allowedOrigins = options.allowedOrigins || [];
    this.jwtSecret = options.jwtSecret;
    this.rateLimiting = options.rateLimiting || { enabled: false };
    
    // Rate limiting storage
    this.requestCounts = new Map();
    
    // Cleanup interval
    setInterval(() => this.cleanupRateLimits(), 60000); // Every minute
  }

  validateOrigin(origin) {
    if (!origin) return false;
    
    return this.allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Wildcard matching
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowed === origin;
    });
  }

  generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  checkRateLimit(identifier) {
    if (!this.rateLimiting.enabled) return { allowed: true };
    
    const now = Date.now();
    const windowStart = now - this.rateLimiting.windowMs;
    
    // Get or create request history for this identifier
    if (!this.requestCounts.has(identifier)) {
      this.requestCounts.set(identifier, []);
    }
    
    const requests = this.requestCounts.get(identifier);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requestCounts.set(identifier, recentRequests);
    
    // Check if under limit
    if (recentRequests.length >= this.rateLimiting.maxRequests) {
      const resetTime = Math.min(...recentRequests) + this.rateLimiting.windowMs;
      return {
        allowed: false,
        resetTime,
        remaining: 0,
        limit: this.rateLimiting.maxRequests
      };
    }
    
    // Add current request
    recentRequests.push(now);
    
    return {
      allowed: true,
      remaining: this.rateLimiting.maxRequests - recentRequests.length,
      limit: this.rateLimiting.maxRequests,
      resetTime: now + this.rateLimiting.windowMs
    };
  }

  cleanupRateLimits() {
    const now = Date.now();
    
    for (const [identifier, requests] of this.requestCounts.entries()) {
      const windowStart = now - this.rateLimiting.windowMs;
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (recentRequests.length === 0) {
        this.requestCounts.delete(identifier);
      } else {
        this.requestCounts.set(identifier, recentRequests);
      }
    }
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Basic XSS protection
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  generateSessionId() {
    return crypto.randomUUID();
  }

  hashPassword(password) {
    const bcrypt = require('bcrypt');
    return bcrypt.hashSync(password, 10);
  }

  verifyPassword(password, hash) {
    const bcrypt = require('bcrypt');
    return bcrypt.compareSync(password, hash);
  }

  createSecureHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    };
  }
}

module.exports = { SecurityManager };