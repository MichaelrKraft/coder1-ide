"use strict";
/**
 * Production-Safe Logger Utility
 *
 * Replaces console.log with environment-aware logging
 * Prevents information leakage in production
 * Provides structured logging with levels
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.containerLogger = exports.socketLogger = exports.aiLogger = exports.terminalLogger = exports.logger = void 0;
var Logger = /** @class */ (function () {
    function Logger(config) {
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        // Browser-safe environment check
        this.isDevelopment = typeof process !== 'undefined'
            ? process.env.NODE_ENV !== 'production'
            : true; // Default to development in browser
        this.config = __assign({ enableInProduction: false, minLevel: this.isDevelopment ? 'debug' : 'warn', prefix: '[Coder1]' }, config);
    }
    Logger.prototype.shouldLog = function (level) {
        if (!this.isDevelopment && !this.config.enableInProduction) {
            return level === 'error'; // Only errors in production by default
        }
        return this.levels[level] >= this.levels[this.config.minLevel];
    };
    Logger.prototype.formatMessage = function (level, message, data) {
        var timestamp = new Date().toISOString();
        var prefix = this.config.prefix || '';
        return "".concat(timestamp, " ").concat(prefix, " [").concat(level.toUpperCase(), "] ").concat(message);
    };
    Logger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.shouldLog('debug')) {
            console.debug.apply(console, args);
        }
    };
    Logger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.shouldLog('info')) {
            console.info.apply(console, args);
        }
    };
    Logger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.shouldLog('warn')) {
            console.warn.apply(console, args);
        }
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.shouldLog('error')) {
            console.error.apply(console, args);
        }
    };
    Logger.prototype.sendToErrorTracking = function (message, error) {
        // Production error tracking
        try {
            // For production, you could integrate with services like:
            // - Sentry: Sentry.captureException(error, { extra: { message } });
            // - LogRocket: LogRocket.captureException(error);
            // - DataDog: DD_LOGS.logger.error(message, error);
            // For now, store critical errors locally for review
            if (typeof window !== 'undefined' && window.localStorage) {
                var errorLog = {
                    timestamp: new Date().toISOString(),
                    message: message,
                    error: (error === null || error === void 0 ? void 0 : error.stack) || (error === null || error === void 0 ? void 0 : error.toString()) || 'Unknown error',
                    url: window.location.href,
                    userAgent: navigator.userAgent
                };
                var existingLogs = JSON.parse(localStorage.getItem('coder1-error-logs') || '[]');
                existingLogs.push(errorLog);
                // Keep only last 50 errors to prevent storage bloat
                var recentLogs = existingLogs.slice(-50);
                localStorage.setItem('coder1-error-logs', JSON.stringify(recentLogs));
            }
        }
        catch (e) {
            // Fail silently to prevent recursive errors
        }
    };
    // Method to retrieve error logs (useful for debugging)
    Logger.prototype.getStoredErrorLogs = function () {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return JSON.parse(localStorage.getItem('coder1-error-logs') || '[]');
            }
        }
        catch (e) {
            return [];
        }
        return [];
    };
    // Method to clear error logs
    Logger.prototype.clearStoredErrorLogs = function () {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem('coder1-error-logs');
            }
        }
        catch (e) {
            // Fail silently
        }
    };
    // Enhanced structured logging for API calls
    Logger.prototype.apiLog = function (method, path, status, duration, error) {
        var level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
        var message = "".concat(method, " ").concat(path, " - ").concat(status, " (").concat(duration, "ms)");
        if (level === 'error' && error) {
            this.error(message, error);
        }
        else if (level === 'warn') {
            this.warn(message);
        }
        else {
            this.info(message);
        }
    };
    // Performance logging
    Logger.prototype.performance = function (operation, startTime, metadata) {
        var duration = Date.now() - startTime;
        var message = "Performance: ".concat(operation, " completed in ").concat(duration, "ms");
        if (duration > 5000) { // Warn if operation takes more than 5 seconds
            this.warn(message, metadata);
        }
        else {
            this.debug(message, metadata);
        }
    };
    // Group logging for better organization
    Logger.prototype.group = function (label) {
        if (this.isDevelopment) {
            console.group(label);
        }
    };
    Logger.prototype.groupEnd = function () {
        if (this.isDevelopment) {
            console.groupEnd();
        }
    };
    // Table logging for structured data
    Logger.prototype.table = function (data) {
        if (this.isDevelopment) {
            console.table(data);
        }
    };
    // Performance timing
    Logger.prototype.time = function (label) {
        if (this.isDevelopment) {
            console.time(label);
        }
    };
    Logger.prototype.timeEnd = function (label) {
        if (this.isDevelopment) {
            console.timeEnd(label);
        }
    };
    return Logger;
}());
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
