/**
 * Development-only logging utility
 * 
 * Automatically disabled in production to improve performance.
 * Prevents 300+ console.log statements from blocking the event loop.
 */

const IS_DEV = process.env.NODE_ENV === 'development';

export const devLog = IS_DEV ? console.log.bind(console) : () => {};
export const devWarn = IS_DEV ? console.warn.bind(console) : () => {};
export const devError = console.error.bind(console); // Always log errors

// For performance-critical logging that should only appear when explicitly debugging
export const perfLog = (message: string, ...args: any[]) => {
  if (IS_DEV && typeof performance !== 'undefined') {
    console.log(`[PERF] ${message}`, ...args);
  }
};
