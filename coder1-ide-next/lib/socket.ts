import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let connectionAttempts = 0;

// Create a mock socket for fallback
const createMockSocket = (): Socket => {
  console.warn('⚠️ Using mock socket - real connection failed');
  const mockSocket = {
    id: 'mock-socket',
    connected: false,
    on: (event: string, callback: Function) => {
      console.log(`Mock socket: on('${event}')`);
      return mockSocket;
    },
    off: (event: string, callback?: Function) => {
      console.log(`Mock socket: off('${event}')`);
      return mockSocket;
    },
    emit: (event: string, ...args: any[]) => {
      console.log(`Mock socket: emit('${event}')`, args);
      return mockSocket;
    },
    disconnect: () => {
      console.log('Mock socket: disconnect()');
      return mockSocket;
    },
    connect: () => {
      console.log('Mock socket: connect()');
      return mockSocket;
    },
    io: {
      engine: {
        transport: { name: 'mock' }
      }
    }
  } as any;
  return mockSocket;
};

export const getSocket = async (sessionId?: string, bridgeAuth: boolean = false): Promise<Socket> => {
  try {
    if (!socket) {
      connectionAttempts++;
      console.log(`🔌 CREATING SOCKET CONNECTION (attempt ${connectionAttempts})`);
      
      // Connect to the unified server (Next.js custom server)
      // In production, use the same origin. In dev, use localhost:3001
      const unifiedUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? `${window.location.protocol}//${window.location.host}`
        : (process.env.NEXT_PUBLIC_UNIFIED_SERVER_URL || 'http://localhost:3001');
      console.log(`🎯 CONNECTING TO UNIFIED SERVER: ${unifiedUrl}`);
      
      let newSocket: Socket;
      
      try {
        newSocket = io(unifiedUrl, {
          path: '/socket.io/',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          forceNew: false
        });

        // Verify socket was created properly
        if (!newSocket || typeof newSocket.on !== 'function') {
          throw new Error('Failed to create Socket.IO instance');
        }
      } catch (ioError) {
        console.error('❌ Socket.IO initialization failed:', ioError);
        // Use mock socket as fallback
        newSocket = createMockSocket();
      }

      // Basic connection event logging
      newSocket.on('connect', () => {
        console.log('✅ SOCKET.IO CONNECTED:', {
          id: newSocket.id,
          url: unifiedUrl,
          timestamp: new Date().toISOString()
        });
        connectionAttempts = 0; // Reset on successful connection
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ SOCKET.IO DISCONNECTED:', {
          reason,
          timestamp: new Date().toISOString(),
          willReconnect: newSocket?.active
        });
      });

      newSocket.on('connect_error', (error) => {
        console.error('🚨 SOCKET.IO CONNECTION ERROR:', {
          message: error.message,
          type: (error as any).type,
          url: unifiedUrl,
          attempt: connectionAttempts,
          timestamp: new Date().toISOString()
        });
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 SOCKET.IO RECONNECTED:', {
          attempts: attemptNumber,
          id: newSocket?.id,
          timestamp: new Date().toISOString()
        });
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 SOCKET.IO RECONNECT ATTEMPT ${attemptNumber}`);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('🚨 SOCKET.IO RECONNECT ERROR:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
      });

      newSocket.on('reconnect_failed', () => {
        console.error('💀 SOCKET.IO RECONNECT FAILED - All attempts exhausted');
      });

      // Assign to module variable after setup
      socket = newSocket;
    }

    return socket;
  } catch (error) {
    console.error('❌ Failed to create Socket.IO connection:', error);
    throw error;
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};