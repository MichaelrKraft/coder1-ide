import { io, Socket } from 'socket.io-client';
import { ClientWebSocketAuth } from './websocket-auth';

let socket: Socket | null = null;
let connectionAttempts = 0;
let wsAuth: ClientWebSocketAuth | null = null;

export const getSocket = async (sessionId?: string, bridgeAuth: boolean = false): Promise<Socket> => {
  if (!socket) {
    connectionAttempts++;
    console.log(`🔌 CREATING AUTHENTICATED SOCKET CONNECTION (attempt ${connectionAttempts})`);
    
    // Initialize WebSocket authentication
    if (!wsAuth) {
      wsAuth = new ClientWebSocketAuth();
    }

    // Get authentication ticket
    let ticketId: string | null = null;
    
    if (sessionId) {
      try {
        ticketId = await wsAuth.requestTicket(sessionId, bridgeAuth);
        console.log('🎫 Received authentication ticket for WebSocket');
      } catch (error) {
        console.error('❌ Failed to get WebSocket authentication ticket:', error);
        // Continue without authentication for backwards compatibility
      }
    }

    // Connect to the unified server (Next.js custom server)
    const unifiedUrl = process.env.NEXT_PUBLIC_UNIFIED_SERVER_URL || 'http://localhost:3001';
    console.log(`🎯 CONNECTING TO UNIFIED SERVER: ${unifiedUrl}`);
    
    socket = io(unifiedUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      auth: ticketId ? { ticketId } : undefined,
    });

    // Enhanced connection event logging
    socket.on('connect', () => {
      console.log('✅ SOCKET.IO CONNECTED:', {
        id: socket?.id,
        transport: socket?.io.engine.transport.name,
        url: unifiedUrl,
        timestamp: new Date().toISOString()
      });
      connectionAttempts = 0; // Reset on successful connection
    });

    socket.on('disconnect', (reason) => {
      // REMOVED: // REMOVED: console.log('❌ SOCKET.IO DISCONNECTED:', {
    //         reason,
    //         timestamp: new Date().toISOString(),
    //         willReconnect: socket?.active
    //       });
    });

    socket.on('connect_error', (error) => {
      console.error('🚨 SOCKET.IO CONNECTION ERROR:', {
        message: error.message,
        type: (error as any).type,
        description: (error as any).description,
        url: unifiedUrl,
        attempt: connectionAttempts,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('reconnect', (attemptNumber) => {
      // REMOVED: // REMOVED: console.log('🔄 SOCKET.IO RECONNECTED:', {
    //         attempts: attemptNumber,
    //         id: socket?.id,
    //         timestamp: new Date().toISOString()
    //       });
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      // REMOVED: // REMOVED: console.log(`🔄 SOCKET.IO RECONNECT ATTEMPT ${attemptNumber}/${socket?.io.opts.reconnectionAttempts}`);
    });

    socket.on('reconnect_error', (error) => {
      console.error('🚨 SOCKET.IO RECONNECT ERROR:', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('reconnect_failed', () => {
      console.error('💀 SOCKET.IO RECONNECT FAILED - All attempts exhausted');
    });

    // Debug transport changes
    (socket.io as any).on('upgrade', () => {
      // REMOVED: console.log('⬆️ SOCKET.IO TRANSPORT UPGRADED:', socket?.io.engine.transport.name);
    });

    (socket.io as any).on('upgradeError', (error: any) => {
      console.error('🚨 SOCKET.IO UPGRADE ERROR:', error);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};