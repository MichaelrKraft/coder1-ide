/**
 * Server Terminal Buffer Access
 * 
 * Safely exposes terminalDataBuffers from server.js to API routes.
 * This is necessary because server.js runs in Node.js context while
 * API routes need access to in-memory terminal buffers.
 */

let serverBuffers = null;

/**
 * Initialize server buffer references
 * Called from server.js during startup
 * 
 * @param {Object} buffers - Object containing buffer Maps from server.js
 * @param {Map<string, any[]>} buffers.terminalDataBuffers - Terminal data buffers
 */
function initializeServerBuffers(buffers) {
  serverBuffers = buffers;
  console.log('[Server Terminal Access] Buffer references initialized');
}

/**
 * Get terminal data buffer for a specific session
 * 
 * @param {string} sessionId - Terminal session ID
 * @returns {any[]|null} Array of buffer chunks or null if not found
 */
function getTerminalDataBuffer(sessionId) {
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
 * @returns {boolean} true if initialized, false otherwise
 */
function isInitialized() {
  return serverBuffers !== null && serverBuffers.terminalDataBuffers !== undefined;
}

/**
 * Get all active session IDs
 * 
 * @returns {string[]} Array of session IDs with buffers
 */
function getActiveSessionIds() {
  if (!serverBuffers || !serverBuffers.terminalDataBuffers) {
    return [];
  }
  
  return Array.from(serverBuffers.terminalDataBuffers.keys());
}

module.exports = {
  initializeServerBuffers,
  getTerminalDataBuffer,
  isInitialized,
  getActiveSessionIds
};
