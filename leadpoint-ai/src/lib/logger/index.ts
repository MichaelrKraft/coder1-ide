/**
 * Structured Logging Utility
 *
 * Provides environment-aware logging with:
 * - Colored, pretty-printed output in development
 * - JSON format for log aggregation in production
 * - Log levels: debug, info, warn, error
 * - PII redaction for production safety
 */

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: LogMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  /** Context/namespace for this logger instance (e.g., "API", "Discovery") */
  context?: string;
  /** Minimum log level to output. Defaults to 'debug' in dev, 'info' in prod */
  minLevel?: LogLevel;
}

// ============================================================================
// Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV !== 'production';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Log level colors
  debug: '\x1b[36m',  // Cyan
  info: '\x1b[32m',   // Green
  warn: '\x1b[33m',   // Yellow
  error: '\x1b[31m',  // Red

  // Metadata colors
  context: '\x1b[35m', // Magenta
  timestamp: '\x1b[90m', // Gray
  key: '\x1b[34m',     // Blue
} as const;

// Fields that should be redacted in production logs
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'api_key',
  'apiKey',
  'authorization',
  'cookie',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
]);

// Fields to partially redact (show partial value)
const PARTIAL_REDACT_FIELDS = new Set([
  'email',
  'phone',
  'ip',
  'user_id',
  'userId',
]);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Redact sensitive data from metadata for production safety
 */
function redactSensitiveData(data: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return '[max depth]';

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      if (SENSITIVE_FIELDS.has(lowerKey)) {
        redacted[key] = '[REDACTED]';
      } else if (PARTIAL_REDACT_FIELDS.has(lowerKey) && typeof value === 'string') {
        redacted[key] = partialRedact(value, lowerKey);
      } else {
        redacted[key] = redactSensitiveData(value, depth + 1);
      }
    }

    return redacted;
  }

  return data;
}

/**
 * Partially redact a string value (show first/last chars)
 */
function partialRedact(value: string, fieldType: string): string {
  if (value.length < 4) {
    return '[REDACTED]';
  }

  if (fieldType === 'email' && value.includes('@')) {
    const [local, domain] = value.split('@');
    const redactedLocal = local.length > 2
      ? local[0] + '***' + local[local.length - 1]
      : '***';
    return `${redactedLocal}@${domain}`;
  }

  // Default: show first 2 and last 2 chars
  return value.slice(0, 2) + '***' + value.slice(-2);
}

/**
 * Format error object for logging
 */
function formatError(error: unknown): LogEntry['error'] | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Format log entry for development (colored, readable)
 */
function formatDev(entry: LogEntry): string {
  const { timestamp, level, message, context, metadata, error } = entry;

  const parts: string[] = [];

  // Timestamp
  parts.push(`${COLORS.timestamp}${timestamp}${COLORS.reset}`);

  // Level with color
  const levelColor = COLORS[level];
  const levelStr = level.toUpperCase().padEnd(5);
  parts.push(`${levelColor}${COLORS.bright}${levelStr}${COLORS.reset}`);

  // Context
  if (context) {
    parts.push(`${COLORS.context}[${context}]${COLORS.reset}`);
  }

  // Message
  parts.push(message);

  let output = parts.join(' ');

  // Metadata
  if (metadata && Object.keys(metadata).length > 0) {
    const metaStr = Object.entries(metadata)
      .map(([k, v]) => `${COLORS.key}${k}${COLORS.reset}=${formatValue(v)}`)
      .join(' ');
    output += `\n  ${metaStr}`;
  }

  // Error
  if (error) {
    output += `\n  ${COLORS.error}${error.name}: ${error.message}${COLORS.reset}`;
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(1, 4);
      output += `\n${COLORS.dim}${stackLines.join('\n')}${COLORS.reset}`;
    }
  }

  return output;
}

/**
 * Format a value for dev output
 */
function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Format log entry for production (JSON)
 */
function formatProd(entry: LogEntry): string {
  // Redact sensitive data in production
  const safeEntry = {
    ...entry,
    metadata: entry.metadata
      ? redactSensitiveData(entry.metadata) as LogMetadata
      : undefined,
  };

  return JSON.stringify(safeEntry);
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private context?: string;
  private minLevel: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.context = options.context;
    this.minLevel = options.minLevel ?? (isDevelopment ? 'debug' : 'info');
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  /**
   * Create and output a log entry
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    error?: unknown
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
      error: formatError(error),
    };

    const formatted = isDevelopment ? formatDev(entry) : formatProd(entry);

    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * Debug level - verbose information for debugging
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }

  /**
   * Info level - general operational information
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  /**
   * Warn level - potentially harmful situations
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  /**
   * Error level - error events that might still allow the app to continue
   */
  error(message: string, metadata?: LogMetadata, error?: unknown): void {
    // If metadata is actually an error, shift arguments
    if (metadata instanceof Error || (metadata && !error && typeof metadata === 'object' && 'message' in metadata && 'stack' in metadata)) {
      this.log('error', message, undefined, metadata);
    } else {
      this.log('error', message, metadata, error);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const childContext = this.context
      ? `${this.context}:${context}`
      : context;
    return new Logger({
      context: childContext,
      minLevel: this.minLevel
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}

/**
 * Create a logger for a specific API route
 */
export function createApiLogger(routeName: string): Logger {
  return new Logger({ context: `API:${routeName}` });
}

/**
 * Create a logger for a specific service
 */
export function createServiceLogger(serviceName: string): Logger {
  return new Logger({ context: `Service:${serviceName}` });
}

// ============================================================================
// Default Logger Instance
// ============================================================================

/**
 * Default logger instance for quick usage
 *
 * @example
 * import { logger } from '@/lib/logger'
 * logger.info('User logged in', { userId: 'xxx' })
 */
export const logger = new Logger();

// ============================================================================
// Convenience Exports
// ============================================================================

export { Logger };
export default logger;
