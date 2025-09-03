/**
 * Production-Safe Logger for Express Backend
 * 
 * Environment-aware logging with structured output
 * Replaces console.log/error with production-safe alternatives
 */

class Logger {
  constructor(name = 'Server') {
    this.name = name;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
    this.logLevel = process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'info');
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5
    };
  }
  
  shouldLog(level) {
    const currentLevel = this.levels[this.logLevel] || 2;
    const messageLevel = this.levels[level] || 5;
    return messageLevel <= currentLevel;
  }
  
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    const emoji = this.getEmoji(level);
    return `[${timestamp}] ${emoji} [${this.name}] ${message}`;
  }
  
  getEmoji(level) {
    const emojis = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      http: '🌐',
      verbose: '📝',
      debug: '🐛'
    };
    return emojis[level] || '📌';
  }
  
  error(message, data) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), data || '');
    }
  }
  
  warn(message, data) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data || '');
    }
  }
  
  info(message, data) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), data || '');
    }
  }
  
  http(message, data) {
    if (this.shouldLog('http')) {
      console.log(this.formatMessage('http', message), data || '');
    }
  }
  
  verbose(message, data) {
    if (this.shouldLog('verbose')) {
      console.log(this.formatMessage('verbose', message), data || '');
    }
  }
  
  debug(message, data) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), data || '');
    }
  }
  
  // Create child logger with specific name
  child(name) {
    return new Logger(`${this.name}:${name}`);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
module.exports.Logger = Logger;