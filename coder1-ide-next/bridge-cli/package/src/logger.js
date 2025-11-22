/**
 * Production Logger
 * Winston-based logging for the Coder1 Bridge
 */

const winston = require('winston');
const path = require('path');
const os = require('os');

// Create logs directory in user's home directory
const logsDir = path.join(os.homedir(), '.coder1', 'logs');

// Ensure logs directory exists
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'coder1-bridge' },
  transports: [
    // Error log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 3
    }),
    // Combined log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'bridge.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ],
});

// Add console output in development or when verbose is enabled
if (process.env.NODE_ENV === 'development' || process.env.VERBOSE === 'true') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Convenience methods
logger.info('Bridge logger initialized', { 
  logsDir,
  level: logger.level 
});

module.exports = logger;