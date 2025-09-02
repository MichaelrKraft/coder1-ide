/**
 * Global Error Handling Middleware
 * 
 * Provides consistent error handling across the application
 */

/**
 * Global error handler
 */
function errorHandler(error, req, res, next) {
    console.error('🚨 Global error handler caught:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Default error response
    let status = error.status || error.statusCode || 500;
    let message = 'Internal Server Error';
    let details = null;

    // Handle specific error types
    if (error.name === 'ValidationError') {
        status = 400;
        message = 'Validation Error';
        details = isDevelopment ? error.message : 'Invalid input provided';
    } else if (error.name === 'UnauthorizedError') {
        status = 401;
        message = 'Unauthorized';
        details = 'Authentication required';
    } else if (error.name === 'CastError') {
        status = 400;
        message = 'Bad Request';
        details = 'Invalid ID format';
    } else if (error.code === 'ENOENT') {
        status = 404;
        message = 'Resource Not Found';
        details = 'The requested resource could not be found';
    } else if (error.code === 'EACCES') {
        status = 403;
        message = 'Forbidden';
        details = 'Access denied';
    } else if (status < 500 && error.message) {
        // Client errors - safe to show message
        message = error.message;
    } else if (isDevelopment && error.message) {
        // Development - show actual error
        details = error.message;
    }

    res.status(status).json({
        success: false,
        error: {
            message,
            details,
            status,
            timestamp: new Date().toISOString(),
            ...(isDevelopment && { stack: error.stack })
        }
    });
}

/**
 * 404 handler for unknown routes
 */
function notFoundHandler(req, res) {
    console.log(`🔍 Route not found: ${req.method} ${req.url}`);
    
    res.status(404).json({
        success: false,
        error: {
            message: 'Route Not Found',
            details: `The requested endpoint ${req.method} ${req.url} does not exist`,
            status: 404,
            timestamp: new Date().toISOString(),
            availableEndpoints: {
                health: 'GET /health',
                agent: 'POST /api/agent/chat',
                tasks: 'GET /api/agent/tasks',
                requirements: 'POST /api/agent/requirements/analyze',
                terminal: 'GET /api/terminal/health'
            }
        }
    });
}

/**
 * Request timeout handler
 */
function timeoutHandler(req, res, next) {
    const timeout = 30000; // 30 seconds
    
    req.setTimeout(timeout, () => {
        console.error(`⏰ Request timeout: ${req.method} ${req.url}`);
        
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                error: {
                    message: 'Request Timeout',
                    details: 'The request took too long to process',
                    status: 408,
                    timeout: timeout + 'ms',
                    timestamp: new Date().toISOString()
                }
            });
        }
    });
    
    next();
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    
    // Log the request
    console.log(`📥 ${req.method} ${req.url} - ${req.ip || req.connection.remoteAddress}`);
    
    // Log the response when it finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? '❌' : '✅';
        console.log(`📤 ${logLevel} ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
}

module.exports = {
    errorHandler,
    notFoundHandler,
    timeoutHandler,
    requestLogger
};