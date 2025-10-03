import { io, Socket } from 'socket.io-client';

// Check if Socket.IO is available (either from bundle or CDN)
const getSocketIO = () => {
  // First try the bundled version
  if (typeof io !== 'undefined') {
    console.log('✅ Using bundled Socket.IO client');
    return io;
  }
  
  // Fallback to CDN version if available
  if (typeof window !== 'undefined' && (window as any).socketIOFallback) {
    console.log('✅ Using Socket.IO CDN fallback');
    return (window as any).socketIOFallback;
  }
  
  // Last resort - try global io
  if (typeof window !== 'undefined' && (window as any).io) {
    console.log('✅ Using global Socket.IO');
    return (window as any).io;
  }
  
  console.error('❌ Socket.IO not available from any source!');
  console.error('This usually means you are using legacy mode (npm run dev:legacy)');
  console.error('Solution: Use "npm run dev" for unified server with Socket.IO support');
  return null;
};

let socket: Socket | null = null;
let connectionAttempts = 0;

// Create a mock socket for fallback
const createMockSocket = (): Socket => {
  console.warn('⚠️ Using mock socket - real connection failed');
  console.warn('This happens when using "npm run dev:legacy" instead of "npm run dev"');
  console.warn('Terminal and WebSocket features will NOT work in legacy mode');
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
      // In production, explicitly use window.location.origin for Render compatibility
      // In dev, use the current port or default to 3001
      const unifiedUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? window.location.origin // Use explicit origin for production (Render needs this)
        : (process.env.NEXT_PUBLIC_UNIFIED_SERVER_URL || 
           (typeof window !== 'undefined' ? `http://localhost:${window.location.port || '3001'}` : 'http://localhost:3001'));
      console.log(`🎯 CONNECTING TO UNIFIED SERVER: ${unifiedUrl}`);
      
      let newSocket: Socket;
      
      try {
        const socketIO = getSocketIO();
        
        if (!socketIO) {
          throw new Error('Socket.IO library not loaded');
        }
        
        newSocket = socketIO(unifiedUrl, {
          path: '/socket.io/',
          transports: ['polling', 'websocket'], // Start with polling for Render compatibility
          reconnection: true,
          reconnectionAttempts: 15, // INCREASED: More retry attempts
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000, // INCREASED: Max backoff to 10 seconds
          timeout: 45000, // INCREASED: Match server connectTimeout
          forceNew: false,
          // UPDATED: Match server ping settings to prevent timeout
          pingTimeout: 120000,  // Match server: 2 minutes
          pingInterval: 30000,  // Match server: 30 seconds
          // ADDED: Additional stability settings
          autoConnect: true,
          withCredentials: true,
          upgrade: true,
          rememberUpgrade: true,
          // ADDED: Keep connection alive during idle
          closeOnBeforeunload: false
        });

        // Verify socket was created properly
        if (!newSocket || typeof newSocket.on !== 'function') {
          throw new Error('Failed to create Socket.IO instance');
        }
      } catch (ioError) {
        console.error('❌ Socket.IO initialization failed:', ioError);
        
        // In production, log the error but still provide a mock socket to prevent crashes
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          console.error('🚨 WARNING: Socket.IO connection failed in production!');
          console.error('Terminal functionality will be limited.');
          console.error('Error details:', ioError);
          // Don't throw - gracefully fallback to mock
        }
        
        console.warn('⚠️ Using mock socket as fallback');
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

      // ADDED: Client-side heartbeat keepalive to prevent idle disconnects
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let lastPongTime = Date.now();
      
      const startHeartbeat = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        // Send ping every 20 seconds (more frequent than server's 30s interval)
        heartbeatInterval = setInterval(() => {
          if (newSocket?.connected) {
            const now = Date.now();
            const timeSinceLastPong = now - lastPongTime;
            
            // If we haven't received a pong in 90 seconds, connection may be stale
            if (timeSinceLastPong > 90000) {
              console.warn(`⚠️ No pong received for ${Math.round(timeSinceLastPong/1000)}s - connection may be stale`);
            }
            
            newSocket.emit('ping', { timestamp: now });
            console.log('💓 Heartbeat ping sent');
          }
        }, 20000); // 20 seconds
      };
      
      const stopHeartbeat = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      };
      
      // Listen for pong responses
      newSocket.on('pong', (data: any) => {
        lastPongTime = Date.now();
        const latency = lastPongTime - (data?.timestamp || lastPongTime);
        console.log(`💚 Heartbeat pong received (latency: ${latency}ms)`);
      });
      
      // Start heartbeat when connected
      newSocket.on('connect', () => {
        lastPongTime = Date.now();
        startHeartbeat();
      });
      
      // Stop heartbeat when disconnected
      newSocket.on('disconnect', () => {
        stopHeartbeat();
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