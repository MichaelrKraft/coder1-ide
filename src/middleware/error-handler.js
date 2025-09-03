/**
 * Express Error Handler Middleware
 * 
 * Provides comprehensive error handling for all Express routes
 * Prevents 500 errors from unhandled exceptions
 * Includes logging, recovery, and proper error responses
 */

const logger = require('../utils/logger');

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch promise rejections
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request Logger Middleware
 * Logs all incoming requests for debugging
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    ip: req.ip
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
}

/**
 * Not Found Handler
 * Handles 404 errors for undefined routes
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Global Error Handler
 * Central error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Default to 500 if no status code
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error details
  if (status >= 500) {
    logger.error('Server Error:', {
      status,
      message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers,
      user: req.user?.id
    });
  } else if (status >= 400) {
    logger.warn('Client Error:', {
      status,
      message,
      url: req.originalUrl,
      method: req.method
    });
  }
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse = {
    error: {
      message,
      status,
      ...(isDevelopment && { 
        stack: err.stack,
        details: err.details 
      })
    }
  };
  
  // Send error response
  res.status(status).json(errorResponse);
}

/**
 * Service Error Recovery Middleware
 * Attempts to recover from specific service errors
 */
function serviceErrorRecovery(err, req, res, next) {
  // WebSocket disconnection recovery
  if (err.message?.includes('WebSocket') || err.message?.includes('ECONNREFUSED')) {
    logger.warn('WebSocket error detected, attempting recovery');
    
    // Trigger WebSocket reconnection
    if (global.io) {
      global.io.emit('reconnect-required');
    }
    
    // Return appropriate error to client
    return res.status(503).json({
      error: {
        message: 'Service temporarily unavailable. Reconnecting...',
        retryAfter: 5
      }
    });
  }
  
  // Database connection recovery
  if (err.message?.includes('database') || err.code === 'ECONNREFUSED') {
    logger.warn('Database error detected, attempting recovery');
    
    // Could trigger database reconnection here
    return res.status(503).json({
      error: {
        message: 'Database temporarily unavailable',
        retryAfter: 10
      }
    });
  }
  
  // Pass to next error handler
  next(err);
}

/**
 * Validation Error Handler
 * Formats validation errors consistently
 */
function validationErrorHandler(err, req, res, next) {
  if (err.name === 'ValidationError' || err.type === 'validation') {
    return res.status(400).json({
      error: {
        message: 'Validation Error',
        status: 400,
        fields: err.fields || err.errors
      }
    });
  }
  next(err);
}

/**
 * Authentication Error Handler
 */
function authErrorHandler(err, req, res, next) {
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        status: 401
      }
    });
  }
  
  if (err.name === 'ForbiddenError' || err.status === 403) {
    return res.status(403).json({
      error: {
        message: 'Access denied',
        status: 403
      }
    });
  }
  
  next(err);
}

/**
 * Rate Limit Error Handler
 */
function rateLimitHandler(err, req, res, next) {
  if (err.status === 429 || err.message?.includes('rate limit')) {
    return res.status(429).json({
      error: {
        message: 'Too many requests. Please try again later.',
        status: 429,
        retryAfter: err.retryAfter || 60
      }
    });
  }
  next(err);
}

/**
 * Timeout Handler
 * Prevents long-running requests from hanging
 */
function timeoutHandler(timeout = 30000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      const err = new Error('Request Timeout');
      err.status = 408;
      next(err);
    }, timeout);
    
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
}

/**
 * CORS Error Handler
 */
function corsErrorHandler(err, req, res, next) {
  if (err.message?.includes('CORS')) {
    return res.status(403).json({
      error: {
        message: 'CORS policy violation',
        status: 403
      }
    });
  }
  next(err);
}

/**
 * Setup all error handling middleware
 * Call this after all other middleware and routes
 */
function setupErrorHandling(app) {
  // Add request logging
  app.use(requestLogger);
  
  // Add timeout handler (30 second default)
  app.use(timeoutHandler(30000));
  
  // Error handling middleware chain (order matters!)
  app.use(validationErrorHandler);
  app.use(authErrorHandler);
  app.use(rateLimitHandler);
  app.use(corsErrorHandler);
  app.use(serviceErrorRecovery);
  
  // 404 handler (must be after all routes)
  app.use(notFoundHandler);
  
  // Global error handler (must be last)
  app.use(errorHandler);
  
  // Handle uncaught exceptions in the Express app
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', {
      promise,
      reason: reason?.stack || reason
    });
  });
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack
    });
    
    // Give time to log before exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  logger.info('Error handling middleware initialized');
}

module.exports = {
  asyncHandler,
  requestLogger,
  notFoundHandler,
  errorHandler,
  serviceErrorRecovery,
  validationErrorHandler,
  authErrorHandler,
  rateLimitHandler,
  timeoutHandler,
  corsErrorHandler,
  setupErrorHandling
};