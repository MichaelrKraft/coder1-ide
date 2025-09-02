/**
 * Input Validation Middleware
 * 
 * Provides request validation and sanitization
 */

/**
 * Validate chat message
 */
function validateChatMessage(req, res, next) {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({
            success: false,
            error: 'Message is required'
        });
    }
    
    if (typeof message !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Message must be a string'
        });
    }
    
    if (message.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Message cannot be empty'
        });
    }
    
    if (message.length > 1000) {
        return res.status(400).json({
            success: false,
            error: 'Message must be less than 1000 characters'
        });
    }
    
    // Sanitize message
    req.body.message = sanitizeInput(message);
    
    next();
}

/**
 * Validate task creation
 */
function validateTaskCreation(req, res, next) {
    const { description, priority, autoExecute } = req.body;
    
    if (!description) {
        return res.status(400).json({
            success: false,
            error: 'Task description is required'
        });
    }
    
    if (typeof description !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Description must be a string'
        });
    }
    
    if (description.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Description cannot be empty'
        });
    }
    
    if (description.length > 500) {
        return res.status(400).json({
            success: false,
            error: 'Description must be less than 500 characters'
        });
    }
    
    // Validate priority if provided
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({
            success: false,
            error: 'Priority must be one of: low, medium, high'
        });
    }
    
    // Validate autoExecute if provided
    if (autoExecute !== undefined && typeof autoExecute !== 'boolean') {
        return res.status(400).json({
            success: false,
            error: 'autoExecute must be a boolean'
        });
    }
    
    // Sanitize inputs
    req.body.description = sanitizeInput(description);
    
    next();
}

/**
 * Validate requirements analysis
 */
function validateRequirementsAnalysis(req, res, next) {
    const { request } = req.body;
    
    if (!request) {
        return res.status(400).json({
            success: false,
            error: 'Request description is required'
        });
    }
    
    if (typeof request !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Request must be a string'
        });
    }
    
    if (request.trim().length < 10) {
        return res.status(400).json({
            success: false,
            error: 'Request must be at least 10 characters long'
        });
    }
    
    if (request.length > 2000) {
        return res.status(400).json({
            success: false,
            error: 'Request must be less than 2000 characters'
        });
    }
    
    // Sanitize input
    req.body.request = sanitizeInput(request);
    
    next();
}

/**
 * Validate enhanced brief generation
 */
function validateBriefGeneration(req, res, next) {
    const { originalRequest, questions, answers } = req.body;
    
    if (!originalRequest || typeof originalRequest !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Original request is required and must be a string'
        });
    }
    
    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Questions array is required and must not be empty'
        });
    }
    
    if (!Array.isArray(answers) || answers.length !== questions.length) {
        return res.status(400).json({
            success: false,
            error: 'Answers array must match the number of questions'
        });
    }
    
    // Validate each question and answer
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answer = answers[i];
        
        if (!question || typeof question.question !== 'string') {
            return res.status(400).json({
                success: false,
                error: `Question ${i + 1} is invalid or missing`
            });
        }
        
        if (!answer || (typeof answer === 'string' && answer.trim().length === 0)) {
            return res.status(400).json({
                success: false,
                error: `Answer ${i + 1} is required`
            });
        }
        
        if (typeof answer === 'string' && answer.length > 1000) {
            return res.status(400).json({
                success: false,
                error: `Answer ${i + 1} must be less than 1000 characters`
            });
        }
    }
    
    // Sanitize inputs
    req.body.originalRequest = sanitizeInput(originalRequest);
    req.body.answers = answers.map(answer => 
        typeof answer === 'string' ? sanitizeInput(answer) : answer
    );
    
    next();
}

/**
 * Rate limiting middleware (simple implementation)
 */
function rateLimit(windowMs = 15 * 60 * 1000, max = 100) {
    const requests = new Map();
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        // Clean old entries
        for (const [key, data] of requests.entries()) {
            if (now - data.resetTime > windowMs) {
                requests.delete(key);
            }
        }
        
        // Get or create request data for this IP
        let requestData = requests.get(ip);
        if (!requestData) {
            requestData = {
                count: 0,
                resetTime: now
            };
            requests.set(ip, requestData);
        }
        
        // Reset if window has passed
        if (now - requestData.resetTime > windowMs) {
            requestData.count = 0;
            requestData.resetTime = now;
        }
        
        // Check if limit exceeded
        if (requestData.count >= max) {
            return res.status(429).json({
                success: false,
                error: {
                    message: 'Too Many Requests',
                    details: `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000} seconds.`,
                    status: 429,
                    retryAfter: Math.ceil((windowMs - (now - requestData.resetTime)) / 1000),
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        // Increment counter
        requestData.count++;
        
        // Add rate limit headers
        res.set({
            'X-RateLimit-Limit': max,
            'X-RateLimit-Remaining': Math.max(0, max - requestData.count),
            'X-RateLimit-Reset': new Date(requestData.resetTime + windowMs)
        });
        
        next();
    };
}

/**
 * Sanitize input string
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/[<>\"']/g, '') // Remove potential XSS characters
        .replace(/\r\n/g, '\n')   // Normalize line endings
        .replace(/\r/g, '\n');    // Normalize line endings
}

/**
 * Validate MongoDB ObjectId format
 */
function validateObjectId(paramName = 'id') {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: `${paramName} parameter is required`
            });
        }
        
        // Simple ObjectId pattern check (24 hex characters)
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: `Invalid ${paramName} format`
            });
        }
        
        next();
    };
}

module.exports = {
    validateChatMessage,
    validateTaskCreation,
    validateRequirementsAnalysis,
    validateBriefGeneration,
    validateObjectId,
    rateLimit,
    sanitizeInput
};