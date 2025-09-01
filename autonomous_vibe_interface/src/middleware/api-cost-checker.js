/**
 * API Cost Checker Middleware
 * 
 * Intercepts API calls to check costs and get user confirmation before proceeding
 */

const apiGuardian = require('../services/api-usage-guardian');

/**
 * Middleware to check API costs before making calls
 */
const checkAPICost = (service = 'anthropic', model = 'claude-3-sonnet', estimatedTokens = 1000) => {
    return async (req, res, next) => {
        // Get user ID from session or use a default for anonymous users
        const userId = req.session?.userId || req.ip || 'anonymous';
        
        // Check if API call should be allowed
        const checkResult = await apiGuardian.checkAPICall(userId, service, model, estimatedTokens);
        
        // If in mock mode, add flag to request
        if (checkResult.mock) {
            req.useMockResponse = true;
            req.mockReason = checkResult.reason;
            return next();
        }
        
        // If not allowed, return error
        if (!checkResult.allowed) {
            return res.status(429).json({
                success: false,
                error: 'API call blocked',
                reason: checkResult.reason,
                currentUsage: {
                    dailyCost: checkResult.currentUsage?.dailyCost.toFixed(4),
                    dailyCalls: checkResult.currentUsage?.dailyCalls,
                    limit: checkResult.limit
                },
                message: 'Daily API limit exceeded. Please try again tomorrow or upgrade your plan.'
            });
        }
        
        // If requires confirmation and not confirmed
        if (checkResult.requiresConfirmation && !req.body?.confirmCost) {
            return res.status(402).json({
                success: false,
                error: 'Cost confirmation required',
                estimatedCost: checkResult.estimatedCost.toFixed(4),
                currentDailyCost: checkResult.currentUsage.dailyCost.toFixed(4),
                message: `This operation will cost approximately $${checkResult.estimatedCost.toFixed(4)}. Please confirm by adding confirmCost: true to your request.`,
                requiresConfirmation: true
            });
        }
        
        // Add usage info to request for later recording
        req.apiUsage = {
            userId,
            service,
            model,
            estimatedTokens,
            estimatedCost: checkResult.estimatedCost
        };
        
        // Continue to next middleware
        next();
    };
};

/**
 * Middleware to record API usage after successful call
 */
const recordAPIUsage = (req, res, next) => {
    // Only record if we have usage data
    if (!req.apiUsage) {
        return next();
    }
    
    // Get actual token count from response if available
    const actualTokens = res.locals.actualTokens || req.apiUsage.estimatedTokens;
    const actualCost = res.locals.actualCost || null;
    
    // Record the usage
    apiGuardian.recordAPICall(
        req.apiUsage.userId,
        req.apiUsage.service,
        req.apiUsage.model,
        actualTokens,
        actualCost
    );
    
    // Add usage info to response
    const usage = apiGuardian.getUserUsage(req.apiUsage.userId);
    res.setHeader('X-API-Daily-Cost', usage.dailyCost.toFixed(4));
    res.setHeader('X-API-Daily-Calls', usage.dailyCalls);
    res.setHeader('X-API-Cost-Limit', apiGuardian.config.maxDailyCost);
    res.setHeader('X-API-Call-Limit', apiGuardian.config.maxDailyCalls);
    
    next();
};

/**
 * Middleware to handle mock responses when in mock mode
 */
const handleMockMode = (defaultResponse = null) => {
    return (req, res, next) => {
        if (!req.useMockResponse) {
            return next();
        }
        
        // Return mock response
        const mockResponse = defaultResponse || {
            success: true,
            mock: true,
            message: 'This is a mock response (API calls disabled)',
            data: {
                content: 'Mock response to prevent API charges',
                model: 'mock',
                usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                }
            }
        };
        
        console.log(`🎭 Returning mock response for ${req.path}`);
        return res.json(mockResponse);
    };
};

/**
 * Express error handler for API-related errors
 */
const handleAPIError = (error, req, res, next) => {
    // Check if it's an API rate limit error
    if (error.status === 429 || error.message?.includes('rate limit')) {
        console.error('⚠️ API Rate limit error:', error.message);
        
        // Open circuit breaker for this user
        const userId = req.session?.userId || req.ip || 'anonymous';
        apiGuardian.openCircuitBreaker(userId);
        
        return res.status(429).json({
            success: false,
            error: 'API rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: error.retry_after || 60
        });
    }
    
    // Check if it's an API key error
    if (error.status === 401 || error.message?.includes('API key') || error.message?.includes('authentication')) {
        console.error('⚠️ API authentication error:', error.message);
        
        return res.status(401).json({
            success: false,
            error: 'API authentication failed',
            message: 'Invalid or missing API key. Please check your configuration.'
        });
    }
    
    // Pass to next error handler
    next(error);
};

module.exports = {
    checkAPICost,
    recordAPIUsage,
    handleMockMode,
    handleAPIError,
    apiGuardian
};