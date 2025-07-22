// Rate limiter middleware to prevent excessive API calls
const rateLimitMap = new Map();

// Configuration
const RATE_LIMIT_CONFIG = {
    windowMs: 60 * 1000, // 1 minute window
    maxRequests: 10, // Max 10 requests per minute
    anthropicLimit: 3, // Max 3 Anthropic API calls per minute
    openaiLimit: 5, // Max 5 OpenAI API calls per minute
    blockDuration: 5 * 60 * 1000 // Block for 5 minutes if exceeded
};

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitMap.entries()) {
        if (now - data.windowStart > RATE_LIMIT_CONFIG.windowMs * 2) {
            rateLimitMap.delete(key);
        }
    }
}, 60 * 1000); // Clean every minute

// General rate limiter
const rateLimit = (req, res, next) => {
    const clientId = req.ip || req.sessionId || 'anonymous';
    const now = Date.now();
    
    if (!rateLimitMap.has(clientId)) {
        rateLimitMap.set(clientId, {
            windowStart: now,
            requestCount: 0,
            anthropicCalls: 0,
            openaiCalls: 0,
            blockedUntil: null
        });
    }
    
    const clientData = rateLimitMap.get(clientId);
    
    // Check if client is blocked
    if (clientData.blockedUntil && now < clientData.blockedUntil) {
        const remainingTime = Math.ceil((clientData.blockedUntil - now) / 1000);
        return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Please try again in ${remainingTime} seconds.`,
            retryAfter: remainingTime
        });
    }
    
    // Reset window if expired
    if (now - clientData.windowStart > RATE_LIMIT_CONFIG.windowMs) {
        clientData.windowStart = now;
        clientData.requestCount = 0;
        clientData.anthropicCalls = 0;
        clientData.openaiCalls = 0;
        clientData.blockedUntil = null;
    }
    
    // Check general rate limit
    if (clientData.requestCount >= RATE_LIMIT_CONFIG.maxRequests) {
        clientData.blockedUntil = now + RATE_LIMIT_CONFIG.blockDuration;
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please slow down your requests.',
            retryAfter: Math.ceil(RATE_LIMIT_CONFIG.blockDuration / 1000)
        });
    }
    
    clientData.requestCount++;
    next();
};

// API-specific rate limiters
const anthropicRateLimit = (req, res, next) => {
    const clientId = req.ip || req.sessionId || 'anonymous';
    const clientData = rateLimitMap.get(clientId);
    
    if (!clientData) {
        return next();
    }
    
    if (clientData.anthropicCalls >= RATE_LIMIT_CONFIG.anthropicLimit) {
        return res.status(429).json({
            error: 'Anthropic API rate limit exceeded',
            message: `Maximum ${RATE_LIMIT_CONFIG.anthropicLimit} Anthropic API calls per minute allowed.`,
            retryAfter: 60
        });
    }
    
    clientData.anthropicCalls++;
    next();
};

const openaiRateLimit = (req, res, next) => {
    const clientId = req.ip || req.sessionId || 'anonymous';
    const clientData = rateLimitMap.get(clientId);
    
    if (!clientData) {
        return next();
    }
    
    if (clientData.openaiCalls >= RATE_LIMIT_CONFIG.openaiLimit) {
        return res.status(429).json({
            error: 'OpenAI API rate limit exceeded',
            message: `Maximum ${RATE_LIMIT_CONFIG.openaiLimit} OpenAI API calls per minute allowed.`,
            retryAfter: 60
        });
    }
    
    clientData.openaiCalls++;
    next();
};

// Connection rate limiter for Socket.IO
const connectionRateLimit = new Map();

const socketConnectionLimit = (socket, next) => {
    const clientId = socket.handshake.address;
    const now = Date.now();
    
    if (!connectionRateLimit.has(clientId)) {
        connectionRateLimit.set(clientId, {
            lastConnection: now,
            connectionCount: 0,
            blocked: false
        });
    }
    
    const clientData = connectionRateLimit.get(clientId);
    
    // Block rapid reconnections (more than 5 in 10 seconds)
    if (now - clientData.lastConnection < 10000) {
        clientData.connectionCount++;
        
        if (clientData.connectionCount > 5) {
            clientData.blocked = true;
            setTimeout(() => {
                clientData.blocked = false;
                clientData.connectionCount = 0;
            }, 30000); // Unblock after 30 seconds
            
            return next(new Error('Too many connection attempts. Please wait.'));
        }
    } else {
        clientData.connectionCount = 1;
    }
    
    clientData.lastConnection = now;
    next();
};

module.exports = {
    rateLimit,
    anthropicRateLimit,
    openaiRateLimit,
    socketConnectionLimit
};