import { io, Socket } from 'socket.io-client';
import { logger } from './logger';

let socket: Socket | null = null;
let connectionAttempts = 0;

export const getSocket = (): Socket => {
  if (!socket) {
    connectionAttempts++;
    logger.debug(`🔌 CREATING SOCKET CONNECTION (attempt ${connectionAttempts})`);
    
    // Connect to the Express backend using environment variable
    // ✅ CRITICAL: Express backend runs on port 3000, NOT 3002
    const backendUrl = process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3000';
    logger.debug(`🎯 CONNECTING TO: ${backendUrl}`);
    
    socket = io(backendUrl, {
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
      logger.debug('✅ SOCKET.IO CONNECTED:', {
        id: socket?.id,
        transport: socket?.io.engine.transport.name,
        url: backendUrl,
        timestamp: new Date().toISOString()
      });
      connectionAttempts = 0; // Reset on successful connection
    });

    socket.on('disconnect', (reason) => {
      logger.debug('❌ SOCKET.IO DISCONNECTED:', {
        reason,
        timestamp: new Date().toISOString(),
        willReconnect: socket?.active
      });
    });

    socket.on('connect_error', (error) => {
      logger.error('🚨 SOCKET.IO CONNECTION ERROR:', {
        message: error.message,
        type: (error as any).type,
        description: (error as any).description,
        url: backendUrl,
        attempt: connectionAttempts,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('reconnect', (attemptNumber) => {
      logger.debug('🔄 SOCKET.IO RECONNECTED:', {
        attempts: attemptNumber,
        id: socket?.id,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      logger.debug(`🔄 SOCKET.IO RECONNECT ATTEMPT ${attemptNumber}/${socket?.io.opts.reconnectionAttempts}`);
    });

    socket.on('reconnect_error', (error) => {
      logger.error('🚨 SOCKET.IO RECONNECT ERROR:', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('reconnect_failed', () => {
      logger.error('💀 SOCKET.IO RECONNECT FAILED - All attempts exhausted');
    });

    // Debug transport changes
    (socket.io as any).on('upgrade', () => {
      logger.debug('⬆️ SOCKET.IO TRANSPORT UPGRADED:', socket?.io.engine.transport.name);
    });

    (socket.io as any).on('upgradeError', (error: any) => {
      logger.error('🚨 SOCKET.IO UPGRADE ERROR:', error);
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