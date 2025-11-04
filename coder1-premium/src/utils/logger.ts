/**
 * Logger Utility
 * Simple console logging with levels and formatting
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMetadata {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, metadata?: LogMetadata): void {
    console.log(this.formatMessage('info', message, metadata));
  }

  warn(message: string, metadata?: LogMetadata): void {
    console.warn(this.formatMessage('warn', message, metadata));
  }

  error(message: string, error?: Error | LogMetadata): void {
    if (error instanceof Error) {
      console.error(this.formatMessage('error', message, { 
        error: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      }));
    } else {
      console.error(this.formatMessage('error', message, error));
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, metadata));
    }
  }
}

export const logger = new Logger();
