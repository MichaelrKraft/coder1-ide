/**
 * WebSocket Authentication Service - Ticket-Based Pattern
 * Implements secure authentication for Coder1 Bridge WebSocket connections
 */

import crypto from 'crypto';

export interface WebSocketTicket {
  ticketId: string;
  userId: string;
  sessionId: string;
  bridgeAuth: boolean;
  permissions: string[];
  expiresAt: number;
  createdAt: number;
}

export interface AuthenticationResult {
  success: boolean;
  ticket?: WebSocketTicket;
  error?: string;
}

/**
 * WebSocket Authentication Manager
 * Handles ticket generation, validation, and cleanup
 */
export class WebSocketAuthManager {
  private tickets = new Map<string, WebSocketTicket>();
  private readonly TICKET_EXPIRY = 30000; // 30 seconds
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    // Start automatic cleanup of expired tickets
    setInterval(() => this.cleanupExpiredTickets(), this.CLEANUP_INTERVAL);
  }

  /**
   * Generate authentication ticket for WebSocket connection
   */
  generateTicket(
    userId: string,
    sessionId: string,
    bridgeAuth: boolean = false,
    permissions: string[] = ['terminal', 'files']
  ): WebSocketTicket {
    const ticketId = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    const ticket: WebSocketTicket = {
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
  validateTicket(ticketId: string): AuthenticationResult {
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
  consumeTicket(ticketId: string): AuthenticationResult {
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
  private cleanupExpiredTickets(): void {
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
export const wsAuthManager = new WebSocketAuthManager();

/**
 * Client-side authentication helper
 */
export class ClientWebSocketAuth {
  private currentTicket: string | null = null;

  /**
   * Request authentication ticket from server
   */
  async requestTicket(
    sessionId: string,
    bridgeAuth: boolean = false
  ): Promise<string> {
    const response = await fetch('/api/websocket/auth/ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        bridgeAuth,
        timestamp: Date.now()
      }),
      credentials: 'include' // Include cookies for session authentication
    });

    if (!response.ok) {
      throw new Error(`Failed to get WebSocket ticket: ${response.status}`);
    }

    const { ticketId } = await response.json();
    this.currentTicket = ticketId;

    console.log('🎫 Received WebSocket authentication ticket');
    return ticketId;
  }

  /**
   * Get current ticket
   */
  getCurrentTicket(): string | null {
    return this.currentTicket;
  }

  /**
   * Clear current ticket
   */
  clearTicket(): void {
    this.currentTicket = null;
  }
}

/**
 * Enhanced Socket.IO authentication middleware for server
 */
export function createSocketAuthMiddleware() {
  return (socket: any, next: any) => {
    const ticketId = socket.handshake.auth?.ticketId;

    if (!ticketId) {
      console.error('❌ WebSocket connection rejected: No authentication ticket');
      return next(new Error('Authentication required'));
    }

    const authResult = wsAuthManager.consumeTicket(ticketId);

    if (!authResult.success) {
      console.error('❌ WebSocket connection rejected:', authResult.error);
      return next(new Error(authResult.error || 'Authentication failed'));
    }

    // Attach authentication info to socket
    socket.userId = authResult.ticket!.userId;
    socket.sessionId = authResult.ticket!.sessionId;
    socket.bridgeAuth = authResult.ticket!.bridgeAuth;
    socket.permissions = authResult.ticket!.permissions;

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
export function requirePermission(permission: string) {
  return (socket: any, next: any) => {
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
export function requireBridgeAuth() {
  return (socket: any, next: any) => {
    if (!socket.bridgeAuth) {
      console.error('❌ Bridge authentication required');
      return next(new Error('Bridge authentication required'));
    }
    next();
  };
}