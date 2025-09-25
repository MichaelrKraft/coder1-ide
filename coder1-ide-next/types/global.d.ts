/**
 * Global type declarations for Coder1 IDE
 */

// Import logger type from our logger module
import type Logger from '../lib/logger';

declare global {
  // Make logger globally available
  var logger: Logger;
  
  // Window interface extensions
  interface Window {
    logger: Logger;
    __usageTrackingInterval?: NodeJS.Timeout;
    terminalSocket?: any; // Socket.IO instance for terminal communication
  }
  
  // Node.js global interface
  namespace NodeJS {
    interface Global {
      logger: Logger;
    }
  }
}

// This file needs to be treated as a module
export {};