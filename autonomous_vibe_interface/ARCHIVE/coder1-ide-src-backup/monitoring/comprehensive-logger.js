/**
 * Comprehensive Logger Service
 * 
 * Provides structured logging for the Coder1 application
 */

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
    }

    _shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.logLevel];
    }

    _formatMessage(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        if (typeof message === 'string') {
            const metaStr = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : '';
            return `${prefix} ${message} ${metaStr}`.trim();
        } else {
            return `${prefix} ${JSON.stringify(message)}`;
        }
    }

    error(message, metadata = {}) {
        if (this._shouldLog('error')) {
            console.error(this._formatMessage('error', message, metadata));
        }
    }

    warn(message, metadata = {}) {
        if (this._shouldLog('warn')) {
            console.warn(this._formatMessage('warn', message, metadata));
        }
    }

    info(message, metadata = {}) {
        if (this._shouldLog('info')) {
            console.log(this._formatMessage('info', message, metadata));
        }
    }

    debug(message, metadata = {}) {
        if (this._shouldLog('debug')) {
            console.log(this._formatMessage('debug', message, metadata));
        }
    }
}

const logger = new Logger();

module.exports = {
    logger,
    Logger
};