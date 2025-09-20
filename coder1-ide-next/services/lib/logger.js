"use strict";
/**
 * Production-Safe Logger Utility
 *
 * Replaces console.log with environment-aware logging
 * Prevents information leakage in production
 * Provides structured logging with levels
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.containerLogger = exports.socketLogger = exports.aiLogger = exports.terminalLogger = exports.logger = void 0;
class Logger {
    constructor(config) {
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        this.isDevelopment = process.env.NODE_ENV !== 'production';
        this.config = {
            enableInProduction: false,
            minLevel: this.isDevelopment ? 'debug' : 'warn',
            prefix: '[Coder1]',
            ...config
        };
    }
    shouldLog(level) {
        if (!this.isDevelopment && !this.config.enableInProduction) {
            return level === 'error'; // Only errors in production by default
        }
        return this.levels[level] >= this.levels[this.config.minLevel];
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const prefix = this.config.prefix || '';
        return `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}`;
    }
    debug(...args) {
        if (this.shouldLog('debug')) {
            console.debug(...args);
        }
    }
    info(...args) {
        if (this.shouldLog('info')) {
            console.info(...args);
        }
    }
    warn(...args) {
        if (this.shouldLog('warn')) {
            console.warn(...args);
        }
    }
    error(...args) {
        if (this.shouldLog('error')) {
            console.error(...args);
        }
    }
    sendToErrorTracking(message, error) {
        // Production error tracking
        try {
            // For production, you could integrate with services like:
            // - Sentry: Sentry.captureException(error, { extra: { message } });
            // - LogRocket: LogRocket.captureException(error);
            // - DataDog: DD_LOGS.logger.error(message, error);
            // For now, store critical errors locally for review
            if (typeof window !== 'undefined' && window.localStorage) {
                const errorLog = {
                    timestamp: new Date().toISOString(),
                    message,
                    error: error?.stack || error?.toString() || 'Unknown error',
                    url: window.location.href,
                    userAgent: navigator.userAgent
                };
                const existingLogs = JSON.parse(localStorage.getItem('coder1-error-logs') || '[]');
                existingLogs.push(errorLog);
                // Keep only last 50 errors to prevent storage bloat
                const recentLogs = existingLogs.slice(-50);
                localStorage.setItem('coder1-error-logs', JSON.stringify(recentLogs));
            }
        }
        catch (e) {
            // Fail silently to prevent recursive errors
        }
    }
    // Method to retrieve error logs (useful for debugging)
    getStoredErrorLogs() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return JSON.parse(localStorage.getItem('coder1-error-logs') || '[]');
            }
        }
        catch (e) {
            return [];
        }
        return [];
    }
    // Method to clear error logs
    clearStoredErrorLogs() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem('coder1-error-logs');
            }
        }
        catch (e) {
            // Fail silently
        }
    }
    // Enhanced structured logging for API calls
    apiLog(method, path, status, duration, error) {
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
        const message = `${method} ${path} - ${status} (${duration}ms)`;
        if (level === 'error' && error) {
            this.error(message, error);
        }
        else if (level === 'warn') {
            this.warn(message);
        }
        else {
            this.info(message);
        }
    }
    // Performance logging
    performance(operation, startTime, metadata) {
        const duration = Date.now() - startTime;
        const message = `Performance: ${operation} completed in ${duration}ms`;
        if (duration > 5000) { // Warn if operation takes more than 5 seconds
            this.warn(message, metadata);
        }
        else {
            this.debug(message, metadata);
        }
    }
    // Group logging for better organization
    group(label) {
        if (this.isDevelopment) {
            console.group(label);
        }
    }
    groupEnd() {
        if (this.isDevelopment) {
            console.groupEnd();
        }
    }
    // Table logging for structured data
    table(data) {
        if (this.isDevelopment) {
            console.table(data);
        }
    }
    // Performance timing
    time(label) {
        if (this.isDevelopment) {
            console.time(label);
        }
    }
    timeEnd(label) {
        if (this.isDevelopment) {
            console.timeEnd(label);
        }
    }
}
// Create default logger instance
exports.logger = new Logger();
// Make logger globally available
if (typeof global !== 'undefined') {
    global.logger = exports.logger;
}
// Create specialized loggers for different modules
exports.terminalLogger = new Logger({ prefix: '[Terminal]' });
exports.aiLogger = new Logger({ prefix: '[AI]' });
exports.socketLogger = new Logger({ prefix: '[Socket]' });
exports.containerLogger = new Logger({ prefix: '[Container]' });
// Export Logger class for custom instances
exports.default = Logger;
