/**
 * WebSocket Authentication Service - Ticket-Based Pattern (CommonJS version)
 * Implements secure authentication for Coder1 Bridge WebSocket connections
 */

const crypto = require('crypto');

/**
 * WebSocket Authentication Manager
 * Handles ticket generation, validation, and cleanup
 */
class WebSocketAuthManager {
  constructor() {
    this.tickets = new Map();
    this.TICKET_EXPIRY = 30000; // 30 seconds
    this.CLEANUP_INTERVAL = 60000; // 1 minute

    // Start automatic cleanup of expired tickets
    setInterval(() => this.cleanupExpiredTickets(), this.CLEANUP_INTERVAL);
  }

  /**
   * Generate authentication ticket for WebSocket connection
   */
  generateTicket(
    userId,
    sessionId,
    bridgeAuth = false,
    permissions = ['terminal', 'files']
  ) {
    const ticketId = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    const ticket = {
      ticketId,
      userId,
      sessionId,
      bridgeAuth,
      permissions,
      expiresAt: now + this.TICKET_EXPIRY,
      createdAt: now
    };

    this.tickets.set(ticketId, ticket);

    console.log('🎫 Generated WebSocket ticket:', {
      ticketId: ticketId.substring(0, 8) + '...',
      userId,
      sessionId,
      bridgeAuth,
      permissions,
      expiresIn: `${this.TICKET_EXPIRY / 1000}s`
    });

    return ticket;
  }

  /**
   * Validate authentication ticket
   */
  validateTicket(ticketId) {
    const ticket = this.tickets.get(ticketId);

    if (!ticket) {
      return {
        success: false,
        error: 'Invalid ticket ID'
      };
    }

    if (Date.now() > ticket.expiresAt) {
      this.tickets.delete(ticketId);
      return {
        success: false,
        error: 'Ticket expired'
      };
    }

    return {
      success: true,
      ticket
    };
  }

  /**
   * Consume (use and invalidate) ticket
   */
  consumeTicket(ticketId) {
    const result = this.validateTicket(ticketId);
    
    if (result.success) {
      // Remove ticket after successful consumption
      this.tickets.delete(ticketId);
      console.log('🎫 Consumed WebSocket ticket:', {
        ticketId: ticketId.substring(0, 8) + '...',
        userId: result.ticket?.userId,
        sessionId: result.ticket?.sessionId
      });
    }

    return result;
  }

  /**
   * Cleanup expired tickets
   */
  cleanupExpiredTickets() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [ticketId, ticket] of this.tickets) {
      if (now > ticket.expiresAt) {
        this.tickets.delete(ticketId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired WebSocket tickets`);
    }
  }

  /**
   * Get authentication stats
   */
  getStats() {
    const now = Date.now();
    const activeTickets = Array.from(this.tickets.values())
      .filter(ticket => now <= ticket.expiresAt);

    return {
      totalTickets: this.tickets.size,
      activeTickets: activeTickets.length,
      bridgeTickets: activeTickets.filter(t => t.bridgeAuth).length,
      oldestTicket: activeTickets.length > 0 
        ? Math.min(...activeTickets.map(t => t.createdAt))
        : null
    };
  }
}

/**
 * Singleton instance for server-side usage
 */
const wsAuthManager = new WebSocketAuthManager();

/**
 * Enhanced Socket.IO authentication middleware for server
 */
function createSocketAuthMiddleware() {
  return (socket, next) => {
    // Bridge namespace has its own JWT-based auth middleware — skip ticket check.
    // Socket.IO 4.6+ runs io.use() for ALL namespaces, so /bridge must be exempted here.
    if (socket.nsp?.name === '/bridge') {
      return next();
    }

    const ticketId = socket.handshake.auth?.ticketId;

    if (!ticketId) {
      // SECURITY FIX (Sep 12, 2026): no guest fallback. A socket without a ticket
      // used to be admitted with terminal permission, which let anonymous clients
      // open a PTY on the server. Fail closed.
      console.warn('❌ WebSocket connection rejected: no authentication ticket');
      return next(new Error('Authentication required'));
    }

    const authResult = wsAuthManager.consumeTicket(ticketId);

    if (!authResult.success) {
      console.error('❌ WebSocket connection rejected:', authResult.error);
      return next(new Error(authResult.error || 'Authentication failed'));
    }

    // Attach authentication info to socket
    socket.authenticated = true;
    socket.userId = authResult.ticket.userId;
    socket.sessionId = authResult.ticket.sessionId;
    socket.bridgeAuth = authResult.ticket.bridgeAuth;
    socket.permissions = authResult.ticket.permissions;

    console.log('✅ WebSocket authenticated:', {
      socketId: socket.id,
      userId: socket.userId,
      sessionId: socket.sessionId,
      bridgeAuth: socket.bridgeAuth,
      permissions: socket.permissions
    });

    next();
  };
}

/**
 * Permission checking middleware
 */
function requirePermission(permission) {
  return (socket, next) => {
    if (!socket.permissions?.includes(permission)) {
      console.error(`❌ Permission denied: ${permission} required`);
      return next(new Error(`Permission denied: ${permission} required`));
    }
    next();
  };
}

/**
 * Bridge-only middleware
 */
function requireBridgeAuth() {
  return (socket, next) => {
    if (!socket.bridgeAuth) {
      console.error('❌ Bridge authentication required');
      return next(new Error('Bridge authentication required'));
    }
    next();
  };
}

module.exports = {
  WebSocketAuthManager,
  wsAuthManager,
  createSocketAuthMiddleware,
  requirePermission,
  requireBridgeAuth
};