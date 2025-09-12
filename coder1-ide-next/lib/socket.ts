import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let connectionAttempts = 0;

export const getSocket = (): Socket => {
  if (!socket) {
    connectionAttempts++;
    console.log(`🔌 CREATING SOCKET CONNECTION (attempt ${connectionAttempts})`);
    
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