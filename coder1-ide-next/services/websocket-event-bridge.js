/**
 * WebSocket Event Bridge (JavaScript version for server.js compatibility)
 * 
 * Simplified version that provides basic WebSocket forwarding capabilities
 * The main TypeScript implementation handles the actual bridge logic via API routes
 */

class WebSocketEventBridge {
  constructor() {
    this.socketServer = null;
    this.isConnected = false;
    // REMOVED: // REMOVED: // REMOVED: console.log('🔗 WebSocket Event Bridge (JS wrapper) initialized');
  }

  /**
   * Connect to the global Socket.IO server
   */
  connectToSocketServer(io) {
    this.socketServer = io;
    this.isConnected = true;
    // REMOVED: // REMOVED: // REMOVED: console.log('🔗 WebSocket Event Bridge connected to global Socket.IO server');
    
    // Set up API route forwarding for bridge events
    this.setupAPIRouteForwarding();
  }

  /**
   * Setup forwarding from API routes to WebSocket
   */
  setupAPIRouteForwarding() {
    // This will be called by API routes to forward events
    global.forwardBridgeEvent = (eventName, data) => {
      if (this.isConnected && this.socketServer) {
        this.socketServer.emit(eventName, data);
        // REMOVED: // REMOVED: // REMOVED: console.log(`🔗 Forwarded bridge event: ${eventName}`);
      }
    };
  }

  /**
   * Forward an event to the global Socket.IO server
   */
  forwardEvent(eventName, data) {
    if (!this.isConnected || !this.socketServer) {
      logger?.warn(`⚠️ WebSocket Event Bridge not connected, dropping event: ${eventName}`);
      return;
    }

    try {
      this.socketServer.emit(eventName, data);
      // REMOVED: // REMOVED: // REMOVED: console.log(`🔗 Forwarded event: ${eventName} for team ${data.teamId}`);
    } catch (error) {
      logger?.error(`❌ Failed to forward event ${eventName}:`, error);
    }
  }

  /**
   * Disconnect from socket server
   */
  disconnect() {
    this.socketServer = null;
    this.isConnected = false;
    // REMOVED: // REMOVED: // REMOVED: console.log('🔗 WebSocket Event Bridge disconnected');
  }
}

// Singleton instance
let instance = null;

function getWebSocketEventBridge() {
  if (!instance) {
    instance = new WebSocketEventBridge();
  }
  return instance;
}

module.exports = { getWebSocketEventBridge };