/**
 * Server Terminal Buffer Access
 * 
 * Safely exposes terminalDataBuffers from server.js to API routes.
 * This is necessary because server.js runs in Node.js context while
 * API routes need access to in-memory terminal buffers.
 */

interface ServerBuffers {
  terminalDataBuffers: Map<string, any[]>;
}

let serverBuffers: ServerBuffers | null = null;

/**
 * Initialize server buffer references
 * Called from server.js during startup
 * 
 * @param buffers - Object containing buffer Maps from server.js
 */
export function initializeServerBuffers(buffers: ServerBuffers): void {
  serverBuffers = buffers;
  console.log('[Server Terminal Access] Buffer references initialized');
}

/**
 * Get terminal data buffer for a specific session
 * 
 * @param sessionId - Terminal session ID
 * @returns Array of buffer chunks or null if not found
 */
export function getTerminalDataBuffer(sessionId: string): any[] | null {
  if (!serverBuffers || !serverBuffers.terminalDataBuffers) {
    console.warn('[Server Terminal Access] terminalDataBuffers not initialized');
    return null;
  }
  
  const buffer = serverBuffers.terminalDataBuffers.get(sessionId);
  
  if (!buffer) {
    console.warn(`[Server Terminal Access] No buffer found for session: ${sessionId}`);
    return null;
  }
  
  console.log(`[Server Terminal Access] Retrieved buffer for session ${sessionId}: ${buffer.length} chunks`);
  return buffer;
}

/**
 * Check if server buffers are initialized
 * 
 * @returns true if initialized, false otherwise
 */
export function isInitialized(): boolean {
  return serverBuffers !== null && serverBuffers.terminalDataBuffers !== undefined;
}

/**
 * Get all active session IDs
 * 
 * @returns Array of session IDs with buffers
 */
export function getActiveSessionIds(): string[] {
  if (!serverBuffers || !serverBuffers.terminalDataBuffers) {
    return [];
  }
  
  return Array.from(serverBuffers.terminalDataBuffers.keys());
}
