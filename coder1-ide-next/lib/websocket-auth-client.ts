/**
 * Client-side WebSocket Authentication
 * Browser-safe version without Node.js dependencies
 */

/**
 * Client-side authentication helper for WebSocket connections
 * This class handles ticket requests from the browser
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